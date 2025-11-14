import "reflect-metadata";
import * as cron from "node-cron";
import { IngredientReactivationService } from "../ingredient-reactivation.service";
import { DistributedCronService } from "../distributed-cron.service";
import { Store } from "../../../entities/stores/Store";
import { Ingredient } from "../../../entities/menus/Ingredient";

// Mock node-cron
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

// Mock DistributedCronService
jest.mock("../distributed-cron.service");

describe("IngredientReactivationService Unit Tests", () => {
  let service: IngredientReactivationService;
  let mockDataSource: any;
  let mockStoreRepository: any;
  let mockIngredientRepository: any;
  let mockDistributedCron: jest.Mocked<DistributedCronService>;
  let mockScheduledTask: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Mock scheduled task
    mockScheduledTask = {
      start: jest.fn(),
      stop: jest.fn(),
    };
    (cron.schedule as jest.Mock).mockReturnValue(mockScheduledTask);

    // Mock repositories
    mockStoreRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockIngredientRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn((entity: any) => {
        if (entity === Store) return mockStoreRepository;
        if (entity === Ingredient) return mockIngredientRepository;
        return null;
      }),
    };

    // Mock DistributedCronService
    mockDistributedCron = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      registerInstance: jest.fn().mockResolvedValue(undefined),
      isLeader: jest.fn().mockResolvedValue(true),
      executeWithLock: jest.fn(),
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      getActiveInstances: jest.fn(),
    } as any;
    
    (DistributedCronService as jest.MockedClass<typeof DistributedCronService>)
      .mockImplementation(() => mockDistributedCron);

    service = new IngredientReactivationService(mockDataSource);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("initialize", () => {
    it("should initialize cron jobs for active stores", async () => {
      const mockStores = [
        { id: "store-1", name: "Store 1", isActive: true, timezone: "Europe/Paris" },
        { id: "store-2", name: "Store 2", isActive: true, timezone: "America/New_York" },
      ];
      mockStoreRepository.find.mockResolvedValue(mockStores);

      await service.initialize();

      expect(mockDistributedCron.connect).toHaveBeenCalled();
      expect(mockDistributedCron.registerInstance).toHaveBeenCalled();
      expect(mockStoreRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(cron.schedule).toHaveBeenCalledTimes(2);
    });

    it("should skip initialization in leader mode if not leader", async () => {
      process.env.CRON_MODE = "leader";
      mockDistributedCron.isLeader.mockResolvedValue(false);
      
      await service.initialize();

      expect(mockDistributedCron.isLeader).toHaveBeenCalled();
      expect(mockStoreRepository.find).not.toHaveBeenCalled();
      expect(cron.schedule).not.toHaveBeenCalled();
      
      delete process.env.CRON_MODE;
    });

    it("should handle initialization errors gracefully", async () => {
      mockDistributedCron.connect.mockRejectedValue(new Error("Connection failed"));

      await service.initialize();

      // Should not throw, just log error
      expect(mockDistributedCron.connect).toHaveBeenCalled();
    });
  });

  describe("scheduleReactivationForStore", () => {
    it("should create cron job with correct expression", () => {
      const mockStore = {
        id: "store-1",
        name: "Test Store",
        timezone: "Europe/Paris",
      } as Store;

      service.scheduleReactivationForStore(mockStore);

      expect(cron.schedule).toHaveBeenCalledWith(
        "0 0 * * *", // Default midnight
        expect.any(Function),
        {
          scheduled: true,
          timezone: "Europe/Paris",
        }
      );
    });

    it("should use custom reactivation time if set", () => {
      const mockStore = {
        id: "store-1",
        name: "Test Store",
        timezone: "Europe/Paris",
        ingredientReactivationTime: "06:30",
      } as any;

      service.scheduleReactivationForStore(mockStore);

      expect(cron.schedule).toHaveBeenCalledWith(
        "30 6 * * *", // 6:30 AM
        expect.any(Function),
        expect.any(Object)
      );
    });

    it("should stop existing job before creating new one", () => {
      const mockStore = {
        id: "store-1",
        name: "Test Store",
      } as Store;

      // Schedule first job
      service.scheduleReactivationForStore(mockStore);
      const firstJob = mockScheduledTask;

      // Schedule second job for same store
      service.scheduleReactivationForStore(mockStore);

      expect(firstJob.stop).toHaveBeenCalled();
    });
  });

  describe("reactivateIngredientsForStore", () => {
    it("should reactivate disabled ingredients past their disabled time", async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 3600000); // 1 hour ago
      
      const mockIngredients = [
        {
          id: "ing-1",
          name: "Tomatoes",
          storeId: "store-1",
          isAvailable: false,
          disabledUntil: pastDate,
        },
        {
          id: "ing-2",
          name: "Cheese",
          storeId: "store-1",
          isAvailable: false,
          disabledUntil: pastDate,
        },
      ];

      mockIngredientRepository.find.mockResolvedValue(mockIngredients);
      mockIngredientRepository.save.mockResolvedValue(mockIngredients);

      await service.reactivateIngredientsForStore("store-1");

      expect(mockIngredientRepository.find).toHaveBeenCalledWith({
        where: {
          storeId: "store-1",
          isAvailable: false,
          disabledUntil: expect.any(Object),
        },
      });

      expect(mockIngredientRepository.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "ing-1",
            isAvailable: true,
            disabledUntil: undefined,
          }),
          expect.objectContaining({
            id: "ing-2",
            isAvailable: true,
            disabledUntil: undefined,
          }),
        ])
      );
    });

    it("should not reactivate ingredients scheduled for future", async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 3600000); // 1 hour from now
      
      const mockIngredients = [
        {
          id: "ing-1",
          storeId: "store-1",
          isAvailable: false,
          disabledUntil: futureDate,
        },
      ];

      mockIngredientRepository.find.mockResolvedValue([]);

      await service.reactivateIngredientsForStore("store-1");

      expect(mockIngredientRepository.save).not.toHaveBeenCalled();
    });

    it("should handle empty ingredient list", async () => {
      mockIngredientRepository.find.mockResolvedValue([]);

      await service.reactivateIngredientsForStore("store-1");

      expect(mockIngredientRepository.save).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockIngredientRepository.find.mockRejectedValue(new Error("Database error"));

      // Should not throw
      await expect(
        service.reactivateIngredientsForStore("store-1")
      ).resolves.toBeUndefined();
    });
  });

  describe("updateStoreReactivationTime", () => {
    it("should update store reactivation time and reschedule", async () => {
      const mockStore = {
        id: "store-1",
        name: "Test Store",
        timezone: "Europe/Paris",
      };
      mockStoreRepository.findOne.mockResolvedValue(mockStore);
      mockStoreRepository.save.mockResolvedValue(mockStore);

      await service.updateStoreReactivationTime("store-1", "08:00", "Europe/London");

      expect(mockStoreRepository.findOne).toHaveBeenCalledWith({
        where: { id: "store-1" },
      });
      expect(mockStoreRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: "Europe/London",
          ingredientReactivationTime: "08:00",
        })
      );
      expect(cron.schedule).toHaveBeenCalled();
    });

    it("should throw error if store not found", async () => {
      mockStoreRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateStoreReactivationTime("store-999", "08:00")
      ).rejects.toThrow("Store store-999 not found");
    });
  });

  describe("reactivateAllStores", () => {
    it("should manually reactivate ingredients for all active stores", async () => {
      const mockStores = [
        { id: "store-1", name: "Store 1", isActive: true },
        { id: "store-2", name: "Store 2", isActive: true },
      ];
      mockStoreRepository.find.mockResolvedValue(mockStores);
      mockIngredientRepository.find.mockResolvedValue([]);

      await service.reactivateAllStores();

      expect(mockStoreRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockIngredientRepository.find).toHaveBeenCalledTimes(2);
    });

    it("should handle errors gracefully", async () => {
      mockStoreRepository.find.mockRejectedValue(new Error("Database error"));

      // Should not throw
      await expect(service.reactivateAllStores()).resolves.toBeUndefined();
    });
  });

  describe("shutdown", () => {
    it("should stop all cron jobs and disconnect", async () => {
      const mockStores = [
        { id: "store-1", name: "Store 1", isActive: true },
        { id: "store-2", name: "Store 2", isActive: true },
      ];
      mockStoreRepository.find.mockResolvedValue(mockStores);

      // Initialize and create jobs
      await service.initialize();

      // Shutdown
      await service.shutdown();

      // All jobs should be stopped
      expect(mockScheduledTask.stop).toHaveBeenCalledTimes(2);
      expect(mockDistributedCron.disconnect).toHaveBeenCalled();
    });
  });

  describe("distributed locking", () => {
    it("should use distributed lock when executing cron job", async () => {
      const mockStore = {
        id: "store-1",
        name: "Test Store",
      } as Store;

      mockDistributedCron.executeWithLock.mockImplementation(
        async (lockName, fn) => {
          await fn();
          return undefined;
        }
      );

      service.scheduleReactivationForStore(mockStore);

      // Get the scheduled function and execute it
      const scheduledFn = (cron.schedule as jest.Mock).mock.calls[0][1];
      await scheduledFn();

      expect(mockDistributedCron.executeWithLock).toHaveBeenCalledWith(
        "ingredient-reactivation:store-1",
        expect.any(Function),
        120000
      );
    });
  });
});