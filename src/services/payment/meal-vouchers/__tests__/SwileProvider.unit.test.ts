import "reflect-metadata";
import { SwileProvider } from "../providers/SwileProvider";
import axios from "axios";

jest.mock("axios");

describe("SwileProvider Unit Tests", () => {
  let provider: SwileProvider;
  let mockAxiosCreate: jest.Mock;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockAxiosCreate = jest.fn().mockReturnValue(mockAxiosInstance);
    (axios.create as jest.Mock) = mockAxiosCreate;

    process.env.SWILE_API_KEY = "test-swile-key";
    process.env.SWILE_API_URL = "https://api.swile.test";

    provider = new SwileProvider();
  });

  afterEach(() => {
    delete process.env.SWILE_API_KEY;
    delete process.env.SWILE_API_URL;
  });

  describe("isConfigured", () => {
    it("should return true when API key is configured", () => {
      expect(provider.isConfigured()).toBe(true);
    });

    it("should return false when API key is not configured", () => {
      delete process.env.SWILE_API_KEY;
      provider = new SwileProvider();
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe("processPayment", () => {
    it("should process payment successfully", async () => {
      const mockResponse = {
        data: {
          transaction_id: "swile_tx_123",
          status: "completed",
          amount: 2500,
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.processPayment({
        orderId: "order-123",
        amount: 25.0,
        voucherCode: "VOUCHER123",
        userIdentifier: "user@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("swile_tx_123");
      expect(result.amount).toBe(25.0);
      expect(result.status).toBe("completed");
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v1/payments", {
        order_id: "order-123",
        amount: 2500,
        voucher_code: "VOUCHER123",
        user_identifier: "user@example.com",
        metadata: undefined,
      });
    });

    it("should handle payment processing errors", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("API Error"));

      const result = await provider.processPayment({
        orderId: "order-123",
        amount: 25.0,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.message).toBe("API Error");
    });

    it("should throw error when provider is not configured", async () => {
      delete process.env.SWILE_API_KEY;
      provider = new SwileProvider();

      const result = await provider.processPayment({
        orderId: "order-123",
        amount: 25.0,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("not configured");
    });

    it("should include metadata in payment request", async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { transaction_id: "tx_123" },
      });

      await provider.processPayment({
        orderId: "order-123",
        amount: 25.0,
        metadata: { storeId: "store-1" },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v1/payments", expect.objectContaining({
        metadata: { storeId: "store-1" },
      }));
    });
  });

  describe("getTransactionStatus", () => {
    it("should retrieve transaction status successfully", async () => {
      const mockResponse = {
        data: {
          transaction_id: "swile_tx_123",
          status: "completed",
          amount: 2500,
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await provider.getTransactionStatus("swile_tx_123");

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe("swile_tx_123");
      expect(result.amount).toBe(25.0);
      expect(result.status).toBe("completed");
      expect(mockAxiosInstance.get).toHaveBeenCalledWith("/v1/payments/swile_tx_123");
    });

    it("should handle errors when retrieving transaction status", async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error("Not found"));

      await expect(provider.getTransactionStatus("invalid")).rejects.toThrow("Not found");
    });

    it("should throw error when provider is not configured", async () => {
      delete process.env.SWILE_API_KEY;
      provider = new SwileProvider();

      await expect(provider.getTransactionStatus("tx_123")).rejects.toThrow("not configured");
    });
  });

  describe("refundTransaction", () => {
    it("should process refund successfully", async () => {
      const mockResponse = {
        data: {
          refund_id: "swile_refund_123",
          status: "completed",
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await provider.refundTransaction({
        transactionId: "swile_tx_123",
        amount: 25.0,
        reason: "Customer request",
      });

      expect(result.success).toBe(true);
      expect(result.refundId).toBe("swile_refund_123");
      expect(result.status).toBe("completed");
      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v1/payments/swile_tx_123/refund", {
        amount: 2500,
        reason: "Customer request",
      });
    });

    it("should handle refund errors", async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error("Refund failed"));

      const result = await provider.refundTransaction({
        transactionId: "swile_tx_123",
        amount: 25.0,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.message).toBe("Refund failed");
    });

    it("should process full refund when amount is not specified", async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { refund_id: "refund_123" },
      });

      await provider.refundTransaction({
        transactionId: "swile_tx_123",
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith("/v1/payments/swile_tx_123/refund", {
        amount: undefined,
        reason: undefined,
      });
    });
  });
});
