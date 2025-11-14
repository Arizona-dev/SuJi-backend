import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import { PaymentsService } from "../../services/payment/payments.service";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";

export class PaymentsController {
  private paymentsService: PaymentsService;

  constructor(dataSource: DataSource = AppDataSource) {
    this.paymentsService = new PaymentsService(dataSource);
  }

  async createPaymentIntent(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { orderId, amount, paymentMethod } = req.body;

      const result = await this.paymentsService.createPaymentIntent(
        orderId,
        amount,
        paymentMethod
      );

      res.status(201).json({
        message: "Payment intent created successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Create payment intent error:", error);
      res.status(500).json({
        message: "Failed to create payment intent",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async confirmPayment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { paymentId, paymentIntentId } = req.body;

      const payment = await this.paymentsService.confirmPayment(
        paymentId,
        paymentIntentId
      );

      res.json({
        message: "Payment confirmed successfully",
        data: payment,
      });
    } catch (error) {
      logger.error("Confirm payment error:", error);
      
      if (error instanceof Error && error.message === "Payment not found") {
        res.status(404).json({
          message: "Payment not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to confirm payment",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers["stripe-signature"] as string;
      const rawBody = (req as any).rawBody;

      if (!signature || !rawBody) {
        res.status(400).json({
          message: "Missing stripe signature or raw body",
        });
        return;
      }

      await this.paymentsService.handleStripeWebhook(rawBody, signature);

      res.json({ received: true });
    } catch (error) {
      logger.error("Stripe webhook error:", error);
      res.status(400).json({
        message: "Webhook processing failed",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getPaymentByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;

      const payments = await this.paymentsService.getPaymentsByOrderId(orderId);

      res.json({
        message: "Payments retrieved successfully",
        data: payments,
      });
    } catch (error) {
      logger.error("Get payments by order error:", error);
      res.status(500).json({
        message: "Failed to retrieve payments",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      const payment = await this.paymentsService.refundPayment(
        paymentId,
        amount,
        reason
      );

      res.json({
        message: "Payment refunded successfully",
        data: payment,
      });
    } catch (error) {
      logger.error("Refund payment error:", error);
      
      if (error instanceof Error && error.message === "Payment not found") {
        res.status(404).json({
          message: "Payment not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to refund payment",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async processeMealVoucher(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { orderId, provider, voucherDetails } = req.body;

      const payment = await this.paymentsService.processMealVoucher(
        orderId,
        provider,
        voucherDetails
      );

      res.status(201).json({
        message: "Meal voucher processed successfully",
        data: payment,
      });
    } catch (error) {
      logger.error("Process meal voucher error:", error);
      res.status(500).json({
        message: "Failed to process meal voucher",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async markCashPayment(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { orderId, amount } = req.body;

      const payment = await this.paymentsService.markCashPayment(
        orderId,
        amount
      );

      res.status(201).json({
        message: "Cash payment marked successfully",
        data: payment,
      });
    } catch (error) {
      logger.error("Mark cash payment error:", error);
      res.status(500).json({
        message: "Failed to mark cash payment",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}