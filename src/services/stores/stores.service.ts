import { DataSource, Repository } from "typeorm";
import { Store } from "../../entities/stores/Store";
import { User } from "../../entities/auth/User";
import { logger } from "../../utils/logger";

export interface CreateStoreRequest {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  timezone?: string;
  ownerId: string;
}

export interface UpdateStoreRequest {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  openingHours?: Record<string, { open: string; close: string }>;
  timezone?: string;
}

export class StoresService {
  private storeRepository: Repository<Store>;
  private userRepository: Repository<User>;

  constructor(private dataSource: DataSource) {
    this.storeRepository = this.dataSource.getRepository(Store);
    this.userRepository = this.dataSource.getRepository(User);
  }

  async createStore(
    request: CreateStoreRequest
  ): Promise<{ store: Store; user: User }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the store
      const store = this.storeRepository.create({
        ...request,
        isActive: true,
      });

      const savedStore = await queryRunner.manager.save(Store, store);

      // Update user to mark as fully registered and link to store
      const user = await this.userRepository.findOne({
        where: { id: request.ownerId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      user.isFullyRegistered = true;
      await queryRunner.manager.save(User, user);

      await queryRunner.commitTransaction();

      logger.info(`Store created: ${savedStore.id} for user: ${user.id}`);

      return { store: savedStore, user };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error("Error creating store:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getStores(): Promise<Store[]> {
    return await this.storeRepository.find({
      where: { isActive: true },
      select: [
        "id",
        "name",
        "description",
        "address",
        "phone",
        "email",
        "openingHours",
        "timezone",
        "isHoliday",
        "holidayMessage",
        "createdAt",
      ],
    });
  }

  async getStoreById(id: string): Promise<Store | null> {
    return await this.storeRepository.findOne({
      where: { id, isActive: true },
      select: [
        "id",
        "name",
        "description",
        "address",
        "phone",
        "email",
        "openingHours",
        "timezone",
        "isHoliday",
        "holidayMessage",
        "createdAt",
      ],
    });
  }

  async updateStore(id: string, request: UpdateStoreRequest): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { id, isActive: true },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // Update fields
    Object.assign(store, request);

    const updatedStore = await this.storeRepository.save(store);

    logger.info(`Store updated: ${id}`);

    return updatedStore;
  }

  async toggleHolidayMode(id: string, holidayMessage?: string): Promise<Store> {
    const store = await this.storeRepository.findOne({
      where: { id, isActive: true },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    store.isHoliday = !store.isHoliday;
    store.holidayMessage = store.isHoliday ? holidayMessage : undefined;

    const updatedStore = await this.storeRepository.save(store);

    logger.info(
      `Holiday mode ${
        store.isHoliday ? "enabled" : "disabled"
      } for store: ${id}`
    );

    return updatedStore;
  }

  async deleteStore(id: string): Promise<void> {
    const store = await this.storeRepository.findOne({
      where: { id, isActive: true },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    store.isActive = false;
    await this.storeRepository.save(store);

    logger.info(`Store deactivated: ${id}`);
  }

  async getStoreWithFullDetails(id: string): Promise<Store | null> {
    return await this.storeRepository.findOne({
      where: { id, isActive: true },
      relations: ["menus", "orders"],
    });
  }
}
