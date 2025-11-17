import * as cron from "node-cron";
import { DataSource, LessThanOrEqual } from "typeorm";
import { Ingredient } from "../../entities/menus/Ingredient";
import { Store } from "../../entities/stores/Store";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";
import { DistributedCronService } from "./distributed-cron.service";

export class IngredientReactivationService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();
  private dataSource: DataSource;
  private distributedCron: DistributedCronService;
  private isLeaderMode: boolean = false;
  private realtimeCheckJob: cron.ScheduledTask | null = null;

  constructor(dataSource: DataSource = AppDataSource) {
    this.dataSource = dataSource;
    this.distributedCron = new DistributedCronService();
  }

  /**
   * Initialize cron jobs for all stores
   */
  async initialize(): Promise<void> {
    try {
      // Connect to Redis for distributed locking
      await this.distributedCron.connect();
      await this.distributedCron.registerInstance();

      // Check if we should run in leader mode
      this.isLeaderMode = process.env.CRON_MODE === "leader";

      if (this.isLeaderMode) {
        // Leader mode: Only one instance runs cron jobs
        const isLeader = await this.distributedCron.isLeader();
        if (!isLeader) {
          logger.info("Not the leader instance, skipping cron job initialization");
          // Check for leadership periodically
          setInterval(async () => {
            const nowLeader = await this.distributedCron.isLeader();
            if (nowLeader && this.cronJobs.size === 0) {
              await this.initializeCronJobs();
            } else if (!nowLeader && this.cronJobs.size > 0) {
              this.stopAllJobs();
            }
          }, 15000); // Check every 15 seconds
          return;
        }
      }

      // Initialize cron jobs (either as leader or in distributed mode)
      await this.initializeCronJobs();
    } catch (error) {
      logger.error("Failed to initialize ingredient reactivation service:", error);
    }
  }

  /**
   * Initialize the actual cron jobs
   */
  private async initializeCronJobs(): Promise<void> {
    const storeRepository = this.dataSource.getRepository(Store);
    const stores = await storeRepository.find({
      where: { isActive: true },
    });

    // Initialize daily scheduled jobs per store
    for (const store of stores) {
      this.scheduleReactivationForStore(store);
    }

    // Initialize real-time check job (runs every minute)
    this.scheduleRealtimeReactivation();

    logger.info(`Initialized ingredient reactivation cron jobs for ${stores.length} stores`);
  }

  /**
   * Schedule reactivation job for a specific store
   */
  scheduleReactivationForStore(store: Store): void {
    // Stop existing job if any
    this.stopJobForStore(store.id);

    // Get reactivation time from store settings or use default (midnight)
    const reactivationTime = this.getReactivationTime(store);
    const cronExpression = this.buildCronExpression(reactivationTime, store.timezone);

    // Create new cron job
    const job = cron.schedule(
      cronExpression,
      async () => {
        // Use distributed locking to ensure only one instance processes each store
        await this.distributedCron.executeWithLock(
          `ingredient-reactivation:${store.id}`,
          async () => {
            await this.reactivateIngredientsForStore(store.id);
          },
          120000 // 2 minute lock TTL
        );
      },
      {
        scheduled: true,
        timezone: store.timezone || "Europe/Paris", // Default to Paris timezone
      }
    );

    this.cronJobs.set(store.id, job);
    logger.info(
      `Scheduled ingredient reactivation for store ${store.name} at ${reactivationTime} ${store.timezone || "Europe/Paris"}`
    );
  }

  /**
   * Schedule real-time reactivation job (runs every minute)
   */
  private scheduleRealtimeReactivation(): void {
    // Stop existing job if any
    if (this.realtimeCheckJob) {
      this.realtimeCheckJob.stop();
      this.realtimeCheckJob = null;
    }

    // Run every minute to check for expired disabledUntil times
    this.realtimeCheckJob = cron.schedule(
      "* * * * *", // Every minute
      async () => {
        // Use distributed locking to ensure only one instance processes
        await this.distributedCron.executeWithLock(
          "ingredient-reactivation:realtime",
          async () => {
            await this.reactivateAllExpiredIngredients();
          },
          120000 // 2 minute lock TTL
        );
      },
      {
        scheduled: true,
        timezone: "Europe/Paris",
      }
    );

    logger.info("Scheduled real-time ingredient reactivation (every minute)");
  }

  /**
   * Reactivate all ingredients across all stores that have expired disabledUntil times
   */
  private async reactivateAllExpiredIngredients(): Promise<void> {
    try {
      const ingredientRepository = this.dataSource.getRepository(Ingredient);

      // Find all disabled ingredients that should be reactivated
      const now = new Date();
      const disabledIngredients = await ingredientRepository.find({
        where: {
          isAvailable: false,
          disabledUntil: LessThanOrEqual(now),
        },
      });

      if (disabledIngredients.length === 0) {
        logger.debug("No ingredients to reactivate across all stores");
        return;
      }

      // Reactivate ingredients
      for (const ingredient of disabledIngredients) {
        ingredient.isAvailable = true;
        ingredient.disabledUntil = undefined;
      }

      await ingredientRepository.save(disabledIngredients);

      logger.info(
        `Reactivated ${disabledIngredients.length} ingredients across all stores`
      );
    } catch (error) {
      logger.error("Failed to reactivate expired ingredients:", error);
    }
  }

  /**
   * Stop cron job for a specific store
   */
  stopJobForStore(storeId: string): void {
    const existingJob = this.cronJobs.get(storeId);
    if (existingJob) {
      existingJob.stop();
      this.cronJobs.delete(storeId);
      logger.info(`Stopped ingredient reactivation job for store ${storeId}`);
    }
  }

  /**
   * Reactivate ingredients for a specific store
   */
  async reactivateIngredientsForStore(storeId: string): Promise<void> {
    try {
      const ingredientRepository = this.dataSource.getRepository(Ingredient);
      
      // Find all disabled ingredients that should be reactivated
      const now = new Date();
      const disabledIngredients = await ingredientRepository.find({
        where: {
          storeId,
          isAvailable: false,
          disabledUntil: LessThanOrEqual(now),
        },
      });

      if (disabledIngredients.length === 0) {
        logger.debug(`No ingredients to reactivate for store ${storeId}`);
        return;
      }

      // Reactivate ingredients
      for (const ingredient of disabledIngredients) {
        ingredient.isAvailable = true;
        ingredient.disabledUntil = undefined;
      }

      await ingredientRepository.save(disabledIngredients);
      
      logger.info(
        `Reactivated ${disabledIngredients.length} ingredients for store ${storeId}`
      );
    } catch (error) {
      logger.error(`Failed to reactivate ingredients for store ${storeId}:`, error);
    }
  }

  /**
   * Manually trigger reactivation for all stores
   */
  async reactivateAllStores(): Promise<void> {
    try {
      const storeRepository = this.dataSource.getRepository(Store);
      const stores = await storeRepository.find({
        where: { isActive: true },
      });

      const promises = stores.map((store) =>
        this.reactivateIngredientsForStore(store.id)
      );

      await Promise.all(promises);
      logger.info(`Manually reactivated ingredients for ${stores.length} stores`);
    } catch (error) {
      logger.error("Failed to manually reactivate all stores:", error);
    }
  }

  /**
   * Get reactivation time from store settings
   */
  private getReactivationTime(store: Store): string {
    // Check if store has custom reactivation time in metadata
    const metadata = store as any;
    if (metadata.ingredientReactivationTime) {
      return metadata.ingredientReactivationTime;
    }
    
    // Default to midnight
    return "00:00";
  }

  /**
   * Build cron expression from time string
   */
  private buildCronExpression(time: string, timezone?: string): string {
    const [hours, minutes] = time.split(":").map((n) => parseInt(n, 10));
    
    // Validate time
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      logger.warn(`Invalid reactivation time: ${time}, using default midnight`);
      return "0 0 * * *"; // Default to midnight
    }

    // Format: minute hour * * *
    return `${minutes} ${hours} * * *`;
  }

  /**
   * Update store reactivation time
   */
  async updateStoreReactivationTime(
    storeId: string,
    time: string,
    timezone?: string
  ): Promise<void> {
    try {
      const storeRepository = this.dataSource.getRepository(Store);
      const store = await storeRepository.findOne({ where: { id: storeId } });

      if (!store) {
        throw new Error(`Store ${storeId} not found`);
      }

      // Store custom settings in a metadata field (you might want to add this to Store entity)
      const metadata = store as any;
      metadata.ingredientReactivationTime = time;
      
      if (timezone) {
        store.timezone = timezone;
      }

      await storeRepository.save(store);

      // Reschedule the cron job
      this.scheduleReactivationForStore(store);

      logger.info(
        `Updated reactivation time for store ${store.name} to ${time} ${timezone || store.timezone}`
      );
    } catch (error) {
      logger.error(`Failed to update reactivation time for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Stop all cron jobs
   */
  private stopAllJobs(): void {
    this.cronJobs.forEach((job, storeId) => {
      job.stop();
      logger.debug(`Stopped cron job for store ${storeId}`);
    });
    this.cronJobs.clear();

    // Stop real-time check job
    if (this.realtimeCheckJob) {
      this.realtimeCheckJob.stop();
      this.realtimeCheckJob = null;
      logger.debug("Stopped real-time ingredient reactivation job");
    }
  }

  /**
   * Shutdown all cron jobs and disconnect
   */
  async shutdown(): Promise<void> {
    this.stopAllJobs();
    await this.distributedCron.disconnect();
    logger.info("Shutdown all ingredient reactivation cron jobs");
  }
}