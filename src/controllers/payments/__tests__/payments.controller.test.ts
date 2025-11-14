import { Request, Response } from "express";
import { PaymentsController } from "../payments.controller";
import { PaymentsService } from "../../../services/payment/payments.service";
import { PaymentStatus, PaymentMethod } from "../../../entities/payments/Payment";

jest.mock("../../../services/payment/payments.service");
jest.mock("../../../utils/logger");

describe("PaymentsController", () => {
  let paymentsController: PaymentsController;
  let mockPaymentsService: jest.Mocked<PaymentsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn().mockReturnThis();
    mockStatus = jest.fn().mockReturnThis();
    
    mockResponse = {
      json: mockJson,
      status: mockStatus,
    };

    mockRequest = {
      body: {},
      params: {},
      headers: {},
    };

    mockPaymentsService = {
      createPaymentIntent: jest.fn(),
      confirmPayment: jest.fn(),
      handleStripeWebhook: jest.fn(),
      getPaymentsByOrderId: jest.fn(),
      refundPayment: jest.fn(),
      processMealVoucher: jest.fn(),
      markCashPayment: jest.fn(),
    } as any;

    (PaymentsService as jest.MockedClass<typeof PaymentsService>).mockImplementation(
      () => mockPaymentsService as any
    );

    paymentsController = new PaymentsController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createPaymentIntent", () => {
    it("should create a payment intent successfully", async () => {
      const mockResult = {
        paymentId: "payment-123",
        clientSecret: "secret_123",
        paymentIntentId: "pi_123",
      };

      mockRequest.body = {
        orderId: "order-123",
        amount: 100,
        paymentMethod: "card",
      };

      mockPaymentsService.createPaymentIntent.mockResolvedValue(mockResult);

      await paymentsController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.createPaymentIntent).toHaveBeenCalledWith(
        "order-123",
        100,
        "card"
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Payment intent created successfully",
        data: mockResult,
      });
    });

    it("should handle validation errors", async () => {
      mockRequest.body = {
        orderId: "invalid-uuid",
        amount: -10,
        paymentMethod: "invalid",
      };

      const validationResult = {
        isEmpty: () => false,
        array: () => [
          { msg: "Valid order ID is required" },
          { msg: "Valid amount is required" },
          { msg: "Valid payment method is required" },
        ],
      };

      jest.spyOn(require("express-validator"), "validationResult").mockReturnValue(validationResult);

      await paymentsController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Validation failed",
        errors: validationResult.array(),
      });
    });

    it("should handle service errors", async () => {
      mockRequest.body = {
        orderId: "order-123",
        amount: 100,
        paymentMethod: "card",
      };

      mockPaymentsService.createPaymentIntent.mockRejectedValue(
        new Error("Stripe API error")
      );

      await paymentsController.createPaymentIntent(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Failed to create payment intent",
        error: "Stripe API error",
      });
    });
  });

  describe("confirmPayment", () => {
    it("should confirm a payment successfully", async () => {
      const mockPayment = {
        id: "payment-123",
        status: PaymentStatus.COMPLETED,
        amount: 100,
        method: PaymentMethod.STRIPE,
      };

      mockRequest.body = {
        paymentId: "payment-123",
        paymentIntentId: "pi_123",
      };

      mockPaymentsService.confirmPayment.mockResolvedValue(mockPayment as any);

      await paymentsController.confirmPayment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.confirmPayment).toHaveBeenCalledWith(
        "payment-123",
        "pi_123"
      );
      expect(mockJson).toHaveBeenCalledWith({
        message: "Payment confirmed successfully",
        data: mockPayment,
      });
    });

    it("should handle payment not found", async () => {
      mockRequest.body = {
        paymentId: "payment-999",
        paymentIntentId: "pi_123",
      };

      mockPaymentsService.confirmPayment.mockRejectedValue(
        new Error("Payment not found")
      );

      await paymentsController.confirmPayment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Payment not found",
      });
    });
  });

  describe("handleStripeWebhook", () => {
    it("should handle webhook successfully", async () => {
      (mockRequest as any).rawBody = Buffer.from("webhook-body");
      mockRequest.headers = {
        "stripe-signature": "sig_123",
      };

      mockPaymentsService.handleStripeWebhook.mockResolvedValue(undefined);

      await paymentsController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.handleStripeWebhook).toHaveBeenCalledWith(
        (mockRequest as any).rawBody,
        "sig_123"
      );
      expect(mockJson).toHaveBeenCalledWith({ received: true });
    });

    it("should reject webhook without signature", async () => {
      mockRequest.headers = {};

      await paymentsController.handleStripeWebhook(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Missing stripe signature or raw body",
      });
    });
  });

  describe("getPaymentByOrderId", () => {
    it("should retrieve payments for an order", async () => {
      const mockPayments = [
        {
          id: "payment-1",
          orderId: "order-123",
          amount: 50,
          status: PaymentStatus.COMPLETED,
        },
        {
          id: "payment-2",
          orderId: "order-123",
          amount: 25,
          status: PaymentStatus.PENDING,
        },
      ];

      mockRequest.params = { orderId: "order-123" };
      mockPaymentsService.getPaymentsByOrderId.mockResolvedValue(mockPayments as any);

      await paymentsController.getPaymentByOrderId(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.getPaymentsByOrderId).toHaveBeenCalledWith("order-123");
      expect(mockJson).toHaveBeenCalledWith({
        message: "Payments retrieved successfully",
        data: mockPayments,
      });
    });
  });

  describe("refundPayment", () => {
    it("should refund a payment successfully", async () => {
      const mockRefundedPayment = {
        id: "payment-123",
        status: PaymentStatus.REFUNDED,
        amount: 100,
        metadata: {
          refundAmount: 50,
          refundReason: "customer_request",
        },
      };

      mockRequest.params = { paymentId: "payment-123" };
      mockRequest.body = {
        amount: 50,
        reason: "customer_request",
      };

      mockPaymentsService.refundPayment.mockResolvedValue(mockRefundedPayment as any);

      await paymentsController.refundPayment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.refundPayment).toHaveBeenCalledWith(
        "payment-123",
        50,
        "customer_request"
      );
      expect(mockJson).toHaveBeenCalledWith({
        message: "Payment refunded successfully",
        data: mockRefundedPayment,
      });
    });
  });

  describe("processeMealVoucher", () => {
    it("should process a meal voucher payment", async () => {
      const mockPayment = {
        id: "payment-456",
        orderId: "order-123",
        amount: 15,
        method: PaymentMethod.SWILE,
        status: PaymentStatus.COMPLETED,
      };

      mockRequest.body = {
        orderId: "order-123",
        provider: "swile",
        voucherDetails: { voucherId: "voucher_123" },
      };

      mockPaymentsService.processMealVoucher.mockResolvedValue(mockPayment as any);

      await paymentsController.processeMealVoucher(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.processMealVoucher).toHaveBeenCalledWith(
        "order-123",
        "swile",
        { voucherId: "voucher_123" }
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Meal voucher processed successfully",
        data: mockPayment,
      });
    });
  });

  describe("markCashPayment", () => {
    it("should mark a cash payment successfully", async () => {
      const mockPayment = {
        id: "payment-789",
        orderId: "order-123",
        amount: 30,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      };

      mockRequest.body = {
        orderId: "order-123",
        amount: 30,
      };

      mockPaymentsService.markCashPayment.mockResolvedValue(mockPayment as any);

      await paymentsController.markCashPayment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockPaymentsService.markCashPayment).toHaveBeenCalledWith(
        "order-123",
        30
      );
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Cash payment marked successfully",
        data: mockPayment,
      });
    });
  });
});