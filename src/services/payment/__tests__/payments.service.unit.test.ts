import "reflect-metadata";
import { PaymentsService } from "../payments.service";
import { Payment, PaymentStatus, PaymentMethod } from "../../../entities/payments/Payment";
import { MealVoucherFactory } from "../meal-vouchers/MealVoucherFactory";

// Mock dependencies
const mockPaymentRepository = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
};

const mockOrderRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
};

const mockDataSource = {
  getRepository: jest.fn((entity: any) => {
    if (entity === Payment) return mockPaymentRepository;
    return mockOrderRepository;
  }),
};

// Mock Stripe
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: "pi_test",
        client_secret: "secret_test",
      }),
      retrieve: jest.fn().mockResolvedValue({
        status: "succeeded",
      }),
    },
    refunds: {
      create: jest.fn().mockResolvedValue({
        id: "refund_test",
        amount: 5000,
      }),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

// Mock MealVoucherFactory
jest.mock("../meal-vouchers/MealVoucherFactory");

describe("PaymentsService Unit Tests", () => {
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(mockDataSource as any);
  });

  describe("createPaymentIntent", () => {
    it("should create a Stripe payment intent for card payments", async () => {
      const mockOrder = { id: "order-1", totalAmount: 100 };
      const mockPayment = {
        id: "payment-1",
        orderId: "order-1",
        amount: 100,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createPaymentIntent("order-1", 100, "card");

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: "order-1" },
      });
      expect(mockPaymentRepository.create).toHaveBeenCalled();
      expect(mockPaymentRepository.save).toHaveBeenCalled();
      expect(result).toHaveProperty("paymentId", "payment-1");
      expect(result).toHaveProperty("clientSecret", "secret_test");
      expect(result).toHaveProperty("paymentIntentId", "pi_test");
    });

    it("should create a cash payment", async () => {
      const mockOrder = { id: "order-1", totalAmount: 50 };
      const mockPayment = {
        id: "payment-2",
        orderId: "order-1",
        amount: 50,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createPaymentIntent("order-1", 50, "cash");

      expect(result).toHaveProperty("paymentId", "payment-2");
      expect(result).toHaveProperty("method", "cash");
      expect(result).not.toHaveProperty("clientSecret");
    });

    it("should throw error if order not found", async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createPaymentIntent("order-999", 100, "card")
      ).rejects.toThrow("Order not found");
    });
  });

  describe("confirmPayment", () => {
    it("should confirm a Stripe payment successfully", async () => {
      const mockPayment = {
        id: "payment-1",
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        order: { id: "order-1", status: "pending" },
        metadata: {},
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));
      mockOrderRepository.save.mockImplementation((o) => Promise.resolve(o));

      const result = await service.confirmPayment("payment-1", "pi_test");

      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: "payment-1" },
        relations: ["order"],
      });
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.metadata).toHaveProperty("paidAt");
    });

    it("should handle failed Stripe payment", async () => {
      const mockPayment = {
        id: "payment-1",
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        order: { id: "order-1", status: "pending" },
        metadata: {},
      };

      // Mock Stripe to return failed status
      const failedStripe = {
        paymentIntents: {
          retrieve: jest.fn().mockResolvedValue({ status: "failed" }),
        },
      };
      (service as any).stripe = failedStripe;

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.confirmPayment("payment-1", "pi_test");

      expect(result.status).toBe(PaymentStatus.FAILED);
    });

    it("should throw error if payment not found", async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(
        service.confirmPayment("payment-999", "pi_test")
      ).rejects.toThrow("Payment not found");
    });
  });

  describe("refundPayment", () => {
    it("should refund a Stripe payment", async () => {
      const mockPayment = {
        id: "payment-1",
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        externalId: "pi_test",
        amount: 100,
        metadata: {},
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.refundPayment("payment-1", 50, "customer_request");

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(result.metadata).toHaveProperty("refundedAt");
      expect(result.metadata).toHaveProperty("refundAmount", 50);
      expect(result.metadata).toHaveProperty("refundReason", "customer_request");
    });

    it("should refund a cash payment", async () => {
      const mockPayment = {
        id: "payment-2",
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        amount: 30,
        metadata: {},
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.refundPayment("payment-2");

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(result.metadata).toHaveProperty("refundedAt");
      expect(result.metadata?.refundAmount).toBe(30);
    });
  });

  describe("processMealVoucher", () => {
    let mockVoucherProvider: any;

    beforeEach(() => {
      mockVoucherProvider = {
        isConfigured: jest.fn().mockReturnValue(true),
        processPayment: jest.fn().mockResolvedValue({
          success: true,
          transactionId: "voucher_tx_123",
          amount: 15,
          status: "completed",
          metadata: { provider: "swile" },
        }),
      };

      (MealVoucherFactory.getProvider as jest.Mock).mockReturnValue(mockVoucherProvider);
    });

    it("should process a Swile meal voucher successfully", async () => {
      const mockOrder = { id: "order-1", totalAmount: 15, status: "pending" };
      const mockPayment = {
        id: "payment-3",
        orderId: "order-1",
        amount: 15,
        method: PaymentMethod.SWILE,
        status: PaymentStatus.PENDING,
        metadata: {},
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));
      mockOrderRepository.save.mockResolvedValue({ ...mockOrder, status: "confirmed" });

      const result = await service.processMealVoucher(
        "order-1",
        "swile",
        { voucherCode: "VOUCHER123", userIdentifier: "user@example.com" }
      );

      expect(MealVoucherFactory.getProvider).toHaveBeenCalledWith("swile");
      expect(mockVoucherProvider.isConfigured).toHaveBeenCalled();
      expect(mockVoucherProvider.processPayment).toHaveBeenCalledWith({
        orderId: "order-1",
        amount: 15,
        voucherCode: "VOUCHER123",
        userIdentifier: "user@example.com",
        metadata: undefined,
      });
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.externalId).toBe("voucher_tx_123");
    });

    it("should handle meal voucher payment failure", async () => {
      mockVoucherProvider.processPayment.mockResolvedValue({
        success: false,
        transactionId: "",
        amount: 15,
        status: "failed",
        message: "Insufficient balance",
      });

      const mockOrder = { id: "order-1", totalAmount: 15, status: "pending" };
      const mockPayment = {
        id: "payment-3",
        method: PaymentMethod.SWILE,
        status: PaymentStatus.PENDING,
        metadata: {},
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.processMealVoucher(
        "order-1",
        "swile",
        { voucherCode: "INVALID" }
      );

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(result.metadata?.failureReason).toBe("Insufficient balance");
    });

    it("should throw error when provider is not configured", async () => {
      mockVoucherProvider.isConfigured.mockReturnValue(false);

      const mockOrder = { id: "order-1", totalAmount: 15 };
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      await expect(
        service.processMealVoucher("order-1", "swile", {})
      ).rejects.toThrow("swile provider is not configured");
    });

    it("should handle different meal voucher providers", async () => {
      const providers = ["edenred", "sodexo", "apetiz", "up_dejeuner"];

      for (const provider of providers) {
        const mockOrder = { id: "order-1", totalAmount: 20, status: "pending" };
        const mockPayment = {
          id: `payment-${provider}`,
          status: PaymentStatus.PENDING,
          metadata: {},
        };

        mockOrderRepository.findOne.mockResolvedValue(mockOrder);
        mockPaymentRepository.create.mockReturnValue(mockPayment);
        mockPaymentRepository.save.mockImplementation((p) => Promise.resolve(p));
        mockOrderRepository.save.mockResolvedValue(mockOrder);

        await service.processMealVoucher(
          "order-1",
          provider as any,
          { voucherCode: `VOUCHER_${provider}` }
        );

        expect(MealVoucherFactory.getProvider).toHaveBeenCalledWith(provider);
      }
    });

    it("should throw error if order not found", async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        service.processMealVoucher("order-999", "swile", {})
      ).rejects.toThrow("Order not found");
    });
  });

  describe("markCashPayment", () => {
    it("should create a cash payment", async () => {
      const mockOrder = { id: "order-1" };
      const mockPayment = {
        id: "payment-cash",
        orderId: "order-1",
        amount: 25,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await service.markCashPayment("order-1", 25);

      expect(result).toEqual(mockPayment);
    });

    it("should throw error if order not found", async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.markCashPayment("order-999", 25)).rejects.toThrow(
        "Order not found"
      );
    });
  });

  describe("getPaymentsByOrderId", () => {
    it("should return payments for an order", async () => {
      const mockPayments = [
        {
          id: "payment-1",
          orderId: "order-1",
          amount: 50,
          status: PaymentStatus.COMPLETED,
        },
        {
          id: "payment-2",
          orderId: "order-1",
          amount: 25,
          status: PaymentStatus.PENDING,
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPaymentsByOrderId("order-1");

      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { order: { id: "order-1" } },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockPayments);
    });
  });
});