import { createClient, RedisClientType } from "redis";
import { logger } from "../../utils/logger";

export class DistributedCronService {
  private redisClient: RedisClientType;
  private lockTTL: number = 60000; // 60 seconds default TTL for locks
  private instanceId: string;

  constructor() {
    this.instanceId = `instance-${process.pid}-${Date.now()}`;
    this.redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
    });

    this.redisClient.on("error", (err) => {
      logger.error("Redis Client Error:", err);
    });

    this.redisClient.on("connect", () => {
      logger.info(`Redis connected for distributed cron (${this.instanceId})`);
    });
  }

  async connect(): Promise<void> {
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.redisClient.isOpen) {
      await this.redisClient.disconnect();
    }
  }

  /**
   * Acquire a distributed lock for a cron job
   * Only one instance in the cluster can hold the lock
   */
  async acquireLock(jobName: string, ttlMs: number = this.lockTTL): Promise<boolean> {
    try {
      const lockKey = `cron:lock:${jobName}`;
      const lockValue = this.instanceId;
      
      // Try to set the lock with NX (only if not exists) and PX (expiry in milliseconds)
      const result = await this.redisClient.set(
        lockKey,
        lockValue,
        {
          NX: true, // Only set if not exists
          PX: ttlMs, // Expiry in milliseconds
        }
      );

      if (result === "OK") {
        logger.debug(`Lock acquired for ${jobName} by ${this.instanceId}`);
        return true;
      }

      // Check if we already own the lock (in case of re-acquisition)
      const currentLockHolder = await this.redisClient.get(lockKey);
      if (currentLockHolder === this.instanceId) {
        // Extend the lock TTL
        await this.redisClient.pExpire(lockKey, ttlMs);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to acquire lock for ${jobName}:`, error);
      return false;
    }
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(jobName: string): Promise<void> {
    try {
      const lockKey = `cron:lock:${jobName}`;
      const currentLockHolder = await this.redisClient.get(lockKey);
      
      // Only release if we own the lock
      if (currentLockHolder === this.instanceId) {
        await this.redisClient.del(lockKey);
        logger.debug(`Lock released for ${jobName} by ${this.instanceId}`);
      }
    } catch (error) {
      logger.error(`Failed to release lock for ${jobName}:`, error);
    }
  }

  /**
   * Execute a function with distributed lock
   */
  async executeWithLock<T>(
    jobName: string,
    fn: () => Promise<T>,
    ttlMs: number = this.lockTTL
  ): Promise<T | null> {
    const hasLock = await this.acquireLock(jobName, ttlMs);
    
    if (!hasLock) {
      logger.debug(`Skipping ${jobName} - another instance holds the lock`);
      return null;
    }

    try {
      logger.info(`Executing ${jobName} with lock on ${this.instanceId}`);
      const result = await fn();
      return result;
    } finally {
      await this.releaseLock(jobName);
    }
  }

  /**
   * Check if this instance is the leader (holds the master lock)
   */
  async isLeader(): Promise<boolean> {
    try {
      const leaderKey = "cron:leader";
      const leaderValue = this.instanceId;
      
      // Try to become leader with 30 second TTL
      const result = await this.redisClient.set(
        leaderKey,
        leaderValue,
        {
          NX: true,
          PX: 30000, // 30 seconds
        }
      );

      if (result === "OK") {
        return true;
      }

      // Check if we're already the leader
      const currentLeader = await this.redisClient.get(leaderKey);
      if (currentLeader === this.instanceId) {
        // Extend leadership
        await this.redisClient.pExpire(leaderKey, 30000);
        return true;
      }

      return false;
    } catch (error) {
      logger.error("Failed to check leadership:", error);
      return false;
    }
  }

  /**
   * Register this instance in the cluster
   */
  async registerInstance(): Promise<void> {
    try {
      const instanceKey = `cron:instances:${this.instanceId}`;
      await this.redisClient.set(
        instanceKey,
        JSON.stringify({
          pid: process.pid,
          startTime: Date.now(),
          hostname: process.env.HOSTNAME || "unknown",
        }),
        {
          PX: 60000, // 60 seconds TTL
        }
      );
      
      // Keep alive by refreshing every 30 seconds
      setInterval(async () => {
        if (this.redisClient.isOpen) {
          await this.redisClient.pExpire(instanceKey, 60000);
        }
      }, 30000);
    } catch (error) {
      logger.error("Failed to register instance:", error);
    }
  }

  /**
   * Get all active instances in the cluster
   */
  async getActiveInstances(): Promise<string[]> {
    try {
      const keys = await this.redisClient.keys("cron:instances:*");
      return keys.map(key => key.replace("cron:instances:", ""));
    } catch (error) {
      logger.error("Failed to get active instances:", error);
      return [];
    }
  }
}