import "reflect-metadata";
import { DistributedCronService } from "../distributed-cron.service";
import { createClient } from "redis";

// Mock Redis client
jest.mock("redis", () => ({
  createClient: jest.fn(),
}));

describe("DistributedCronService Unit Tests", () => {
  let service: DistributedCronService;
  let mockRedisClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockRedisClient = {
      isOpen: false,
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      pExpire: jest.fn(),
      keys: jest.fn(),
      on: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    
    service = new DistributedCronService();
  });

  describe("connect/disconnect", () => {
    it("should connect to Redis when not connected", async () => {
      mockRedisClient.isOpen = false;
      
      await service.connect();
      
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it("should not reconnect if already connected", async () => {
      mockRedisClient.isOpen = true;
      
      await service.connect();
      
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });

    it("should disconnect from Redis when connected", async () => {
      mockRedisClient.isOpen = true;
      
      await service.disconnect();
      
      expect(mockRedisClient.disconnect).toHaveBeenCalled();
    });

    it("should not disconnect if not connected", async () => {
      mockRedisClient.isOpen = false;
      
      await service.disconnect();
      
      expect(mockRedisClient.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("acquireLock", () => {
    it("should acquire lock when not exists", async () => {
      mockRedisClient.set.mockResolvedValue("OK");
      
      const result = await service.acquireLock("test-job", 60000);
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "cron:lock:test-job",
        expect.stringContaining("instance-"),
        {
          NX: true,
          PX: 60000,
        }
      );
      expect(result).toBe(true);
    });

    it("should return false when lock is held by another instance", async () => {
      mockRedisClient.set.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue("another-instance-123");
      
      const result = await service.acquireLock("test-job", 60000);
      
      expect(result).toBe(false);
    });

    it("should extend lock TTL when already owned", async () => {
      const instanceId = (service as any).instanceId;
      mockRedisClient.set.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue(instanceId);
      mockRedisClient.pExpire.mockResolvedValue(1);
      
      const result = await service.acquireLock("test-job", 60000);
      
      expect(mockRedisClient.pExpire).toHaveBeenCalledWith(
        "cron:lock:test-job",
        60000
      );
      expect(result).toBe(true);
    });

    it("should handle errors gracefully", async () => {
      mockRedisClient.set.mockRejectedValue(new Error("Redis error"));
      
      const result = await service.acquireLock("test-job", 60000);
      
      expect(result).toBe(false);
    });
  });

  describe("releaseLock", () => {
    it("should release lock when owned by current instance", async () => {
      const instanceId = (service as any).instanceId;
      mockRedisClient.get.mockResolvedValue(instanceId);
      mockRedisClient.del.mockResolvedValue(1);
      
      await service.releaseLock("test-job");
      
      expect(mockRedisClient.get).toHaveBeenCalledWith("cron:lock:test-job");
      expect(mockRedisClient.del).toHaveBeenCalledWith("cron:lock:test-job");
    });

    it("should not release lock when owned by another instance", async () => {
      mockRedisClient.get.mockResolvedValue("another-instance-123");
      
      await service.releaseLock("test-job");
      
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      mockRedisClient.get.mockRejectedValue(new Error("Redis error"));
      
      // Should not throw
      await expect(service.releaseLock("test-job")).resolves.toBeUndefined();
    });
  });

  describe("executeWithLock", () => {
    it("should execute function when lock is acquired", async () => {
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockResolvedValue((service as any).instanceId);
      mockRedisClient.del.mockResolvedValue(1);
      
      const mockFn = jest.fn().mockResolvedValue("result");
      
      const result = await service.executeWithLock("test-job", mockFn, 60000);
      
      expect(mockFn).toHaveBeenCalled();
      expect(result).toBe("result");
      expect(mockRedisClient.del).toHaveBeenCalled();
    });

    it("should not execute function when lock cannot be acquired", async () => {
      mockRedisClient.set.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue("another-instance");
      
      const mockFn = jest.fn();
      
      const result = await service.executeWithLock("test-job", mockFn, 60000);
      
      expect(mockFn).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should release lock even if function throws", async () => {
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.get.mockResolvedValue((service as any).instanceId);
      mockRedisClient.del.mockResolvedValue(1);
      
      const mockFn = jest.fn().mockRejectedValue(new Error("Function error"));
      
      await expect(
        service.executeWithLock("test-job", mockFn, 60000)
      ).rejects.toThrow("Function error");
      
      expect(mockRedisClient.del).toHaveBeenCalled();
    });
  });

  describe("isLeader", () => {
    it("should become leader when no current leader", async () => {
      mockRedisClient.set.mockResolvedValue("OK");
      
      const result = await service.isLeader();
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        "cron:leader",
        expect.stringContaining("instance-"),
        {
          NX: true,
          PX: 30000,
        }
      );
      expect(result).toBe(true);
    });

    it("should return true if already leader", async () => {
      const instanceId = (service as any).instanceId;
      mockRedisClient.set.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue(instanceId);
      mockRedisClient.pExpire.mockResolvedValue(1);
      
      const result = await service.isLeader();
      
      expect(mockRedisClient.pExpire).toHaveBeenCalledWith("cron:leader", 30000);
      expect(result).toBe(true);
    });

    it("should return false if another instance is leader", async () => {
      mockRedisClient.set.mockResolvedValue(null);
      mockRedisClient.get.mockResolvedValue("another-instance");
      
      const result = await service.isLeader();
      
      expect(result).toBe(false);
    });

    it("should handle errors and return false", async () => {
      mockRedisClient.set.mockRejectedValue(new Error("Redis error"));
      
      const result = await service.isLeader();
      
      expect(result).toBe(false);
    });
  });

  describe("registerInstance", () => {
    it("should register instance with metadata", async () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);
      
      mockRedisClient.set.mockResolvedValue("OK");
      
      await service.registerInstance();
      
      expect(mockRedisClient.set).toHaveBeenCalledWith(
        expect.stringContaining("cron:instances:instance-"),
        expect.stringContaining('"startTime":' + now),
        {
          PX: 60000,
        }
      );
      
      jest.useRealTimers();
    });

    it("should set up keep-alive interval", async () => {
      jest.useFakeTimers();
      
      mockRedisClient.set.mockResolvedValue("OK");
      mockRedisClient.pExpire.mockResolvedValue(1);
      mockRedisClient.isOpen = true;
      
      await service.registerInstance();
      
      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      expect(mockRedisClient.pExpire).toHaveBeenCalledWith(
        expect.stringContaining("cron:instances:"),
        60000
      );
      
      jest.useRealTimers();
    });
  });

  describe("getActiveInstances", () => {
    it("should return list of active instance IDs", async () => {
      mockRedisClient.keys.mockResolvedValue([
        "cron:instances:instance-1",
        "cron:instances:instance-2",
        "cron:instances:instance-3",
      ]);
      
      const result = await service.getActiveInstances();
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith("cron:instances:*");
      expect(result).toEqual(["instance-1", "instance-2", "instance-3"]);
    });

    it("should return empty array on error", async () => {
      mockRedisClient.keys.mockRejectedValue(new Error("Redis error"));
      
      const result = await service.getActiveInstances();
      
      expect(result).toEqual([]);
    });
  });
});