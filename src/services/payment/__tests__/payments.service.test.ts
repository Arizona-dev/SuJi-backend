import { DataSource } from "typeorm";
import { PaymentsService } from "../payments.service";
import { Payment, PaymentStatus, PaymentMethod } from "../../../entities/payments/Payment";
import { Order } from "../../../entities/orders/Order";
import Stripe from "stripe";

// Mock the database configuration
jest.mock("../../../config/database", () => ({
  AppDataSource: {
    initialize: jest.fn().mockResolvedValue(true),
    destroy: jest.fn().mockResolvedValue(true),
    isInitialized: true,
  },
}));

jest.mock("stripe");

describe("PaymentsService", () => {
  let paymentsService: PaymentsService;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockPaymentRepository: any;
  let mockOrderRepository: any;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    mockPaymentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };

    mockOrderRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockDataSource = {
      getRepository: jest.fn((entity) => {
        if (entity === Payment) return mockPaymentRepository;
        if (entity === Order) return mockOrderRepository;
        return null;
      }),
    } as any;

    mockStripe = {
      paymentIntents: {
        create: jest.fn().mockResolvedValue({}),
        retrieve: jest.fn().mockResolvedValue({}),
      },
      refunds: {
        create: jest.fn().mockResolvedValue({}),
      },
      webhooks: {
        constructEvent: jest.fn(),
      },
    } as any;

    (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe as any);

    paymentsService = new PaymentsService(mockDataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPaymentIntent", () => {
    it("should create a Stripe payment intent for card payments", async () => {
      const mockOrder = { id: "order-123", totalAmount: 100 };
      const mockPaymentIntent = {
        id: "pi_123",
        client_secret: "secret_123",
      };
      const mockPayment = {
        id: "payment-123",
        orderId: "order-123",
        amount: 100,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      (mockStripe.paymentIntents.create as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await paymentsService.createPaymentIntent(
        "order-123",
        100,
        "card"
      );

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: "order-123" },
      });
      expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 10000,
        currency: "eur",
        metadata: { orderId: "order-123" },
      });
      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        orderId: "order-123",
        amount: 100,
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        externalId: "pi_123",
        metadata: { clientSecret: "secret_123" },
      });
      expect(result).toEqual({
        paymentId: "payment-123",
        clientSecret: "secret_123",
        paymentIntentId: "pi_123",
      });
    });

    it("should create a cash payment", async () => {
      const mockOrder = { id: "order-123", totalAmount: 50 };
      const mockPayment = {
        id: "payment-456",
        orderId: "order-123",
        amount: 50,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await paymentsService.createPaymentIntent(
        "order-123",
        50,
        "cash"
      );

      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: "order-123" },
      });
      expect(mockStripe.paymentIntents.create).not.toHaveBeenCalled();
      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        orderId: "order-123",
        amount: 50,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      });
      expect(result).toEqual({
        paymentId: "payment-456",
        method: "cash",
      });
    });

    it("should throw error if order not found", async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        paymentsService.createPaymentIntent("order-999", 100, "card")
      ).rejects.toThrow("Order not found");
    });
  });

  describe("confirmPayment", () => {
    it("should confirm a Stripe payment", async () => {
      const mockPayment = {
        id: "payment-123",
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        order: { id: "order-123", status: "pending" },
        metadata: {},
      };
      const mockPaymentIntent = {
        status: "succeeded",
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      (mockStripe.paymentIntents.retrieve as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      });

      const result = await paymentsService.confirmPayment("payment-123", "pi_123");

      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: "payment-123" },
        relations: ["order"],
      });
      expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith("pi_123");
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          metadata: expect.objectContaining({
            paidAt: expect.any(Date),
          }),
        })
      );
      expect(result.status).toBe(PaymentStatus.COMPLETED);
    });

    it("should mark payment as failed if Stripe payment intent not succeeded", async () => {
      const mockPayment = {
        id: "payment-123",
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
        order: { id: "order-123", status: "pending" },
        metadata: {},
      };
      const mockPaymentIntent = {
        status: "failed",
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      (mockStripe.paymentIntents.retrieve as jest.Mock).mockResolvedValue(mockPaymentIntent);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      const result = await paymentsService.confirmPayment("payment-123", "pi_123");

      expect(result.status).toBe(PaymentStatus.FAILED);
    });

    it("should throw error if payment not found", async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(
        paymentsService.confirmPayment("payment-999", "pi_123")
      ).rejects.toThrow("Payment not found");
    });
  });

  describe("refundPayment", () => {
    it("should refund a Stripe payment", async () => {
      const mockPayment = {
        id: "payment-123",
        method: PaymentMethod.STRIPE,
        status: PaymentStatus.COMPLETED,
        externalId: "pi_123",
        amount: 100,
        metadata: {},
      };
      const mockRefund = {
        id: "refund_123",
        amount: 5000,
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      (mockStripe.refunds.create as jest.Mock).mockResolvedValue(mockRefund);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });

      const result = await paymentsService.refundPayment(
        "payment-123",
        50,
        "customer_request"
      );

      expect(mockStripe.refunds.create).toHaveBeenCalledWith({
        payment_intent: "pi_123",
        amount: 5000,
        reason: "customer_request",
      });
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          metadata: expect.objectContaining({
            refundedAt: expect.any(Date),
            refundAmount: 50,
            refundId: "refund_123",
            refundReason: "customer_request",
          }),
        })
      );
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });

    it("should refund a cash payment", async () => {
      const mockPayment = {
        id: "payment-456",
        method: PaymentMethod.CASH,
        status: PaymentStatus.COMPLETED,
        amount: 50,
        metadata: {},
      };

      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });

      const result = await paymentsService.refundPayment(
        "payment-456",
        25,
        "customer_request"
      );

      expect(mockStripe.refunds.create).not.toHaveBeenCalled();
      expect(mockPaymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          metadata: expect.objectContaining({
            refundedAt: expect.any(Date),
            refundAmount: 25,
            refundReason: "customer_request",
          }),
        })
      );
      expect(result.status).toBe(PaymentStatus.REFUNDED);
    });
  });

  describe("processMealVoucher", () => {
    it("should process a Swile meal voucher payment", async () => {
      const mockOrder = {
        id: "order-123",
        totalAmount: 15,
        status: "pending",
      };
      const mockPayment = {
        id: "payment-789",
        orderId: "order-123",
        amount: 15,
        method: PaymentMethod.SWILE,
        status: PaymentStatus.PENDING,
        metadata: {},
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save
        .mockResolvedValueOnce(mockPayment)
        .mockResolvedValueOnce({
          ...mockPayment,
          status: PaymentStatus.COMPLETED,
        });
      mockOrderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: "confirmed",
      });

      const result = await paymentsService.processMealVoucher(
        "order-123",
        "swile",
        { voucherId: "voucher_123" }
      );

      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        orderId: "order-123",
        amount: 15,
        method: PaymentMethod.SWILE,
        status: PaymentStatus.PENDING,
        metadata: {
          provider: "swile",
          voucherDetails: { voucherId: "voucher_123" },
        },
      });
      expect(result.status).toBe(PaymentStatus.COMPLETED);
      expect(result.method).toBe(PaymentMethod.SWILE);
    });

    it("should handle different meal voucher providers", async () => {
      const providers = [
        { name: "edenred", method: PaymentMethod.EDENRED },
        { name: "sodexo", method: PaymentMethod.SODEXO },
        { name: "apetiz", method: PaymentMethod.APETIZ },
        { name: "up_dejeuner", method: PaymentMethod.UP_DEJEUNER },
      ];

      for (const provider of providers) {
        const mockOrder = {
          id: `order-${provider.name}`,
          totalAmount: 20,
          status: "pending",
        };
        const mockPayment = {
          id: `payment-${provider.name}`,
          orderId: mockOrder.id,
          amount: 20,
          method: provider.method,
          status: PaymentStatus.PENDING,
          metadata: {},
        };

        mockOrderRepository.findOne.mockResolvedValue(mockOrder);
        mockPaymentRepository.create.mockReturnValue(mockPayment);
        mockPaymentRepository.save.mockResolvedValue({
          ...mockPayment,
          status: PaymentStatus.COMPLETED,
        });
        mockOrderRepository.save.mockResolvedValue({
          ...mockOrder,
          status: "confirmed",
        });

        const result = await paymentsService.processMealVoucher(
          mockOrder.id,
          provider.name,
          { voucherId: `voucher_${provider.name}` }
        );

        expect(result.method).toBe(provider.method);
      }
    });
  });

  describe("markCashPayment", () => {
    it("should create a cash payment", async () => {
      const mockOrder = { id: "order-123" };
      const mockPayment = {
        id: "payment-cash-123",
        orderId: "order-123",
        amount: 30,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      };

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await paymentsService.markCashPayment("order-123", 30);

      expect(mockPaymentRepository.create).toHaveBeenCalledWith({
        orderId: "order-123",
        amount: 30,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      });
      expect(result).toEqual(mockPayment);
    });

    it("should throw error if order not found", async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(
        paymentsService.markCashPayment("order-999", 30)
      ).rejects.toThrow("Order not found");
    });
  });

  describe("getPaymentsByOrderId", () => {
    it("should return payments for an order", async () => {
      const mockPayments = [
        {
          id: "payment-1",
          orderId: "order-123",
          amount: 50,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.COMPLETED,
          createdAt: new Date("2024-01-01"),
        },
        {
          id: "payment-2",
          orderId: "order-123",
          amount: 10,
          method: PaymentMethod.CASH,
          status: PaymentStatus.PENDING,
          createdAt: new Date("2024-01-02"),
        },
      ];

      mockPaymentRepository.find.mockResolvedValue(mockPayments);

      const result = await paymentsService.getPaymentsByOrderId("order-123");

      expect(mockPaymentRepository.find).toHaveBeenCalledWith({
        where: { order: { id: "order-123" } },
        order: { createdAt: "DESC" },
      });
      expect(result).toEqual(mockPayments);
    });
  });
});