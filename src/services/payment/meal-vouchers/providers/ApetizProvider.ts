import axios, { AxiosInstance } from "axios";
import { logger } from "../../../../utils/logger";
import {
  IMealVoucherProvider,
  VoucherPaymentRequest,
  VoucherPaymentResponse,
  VoucherRefundRequest,
  VoucherRefundResponse,
} from "../interfaces/IMealVoucherProvider";

export class ApetizProvider implements IMealVoucherProvider {
  private apiKey: string;
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || process.env.APETIZ_API_KEY || "";
    this.apiUrl = apiUrl || process.env.APETIZ_API_URL || "https://api.apetiz.com";

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  isConfigured(): boolean {
    return this.apiKey !== "" && this.apiKey !== undefined && this.apiKey !== null;
  }

  async processPayment(request: VoucherPaymentRequest): Promise<VoucherPaymentResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error("Apetiz provider is not configured");
      }

      logger.info(`Processing Apetiz payment for order ${request.orderId}`);

      const response = await this.client.post("/api/payments", {
        order_reference: request.orderId,
        amount_cents: Math.round(request.amount * 100),
        voucher_code: request.voucherCode,
        user_id: request.userIdentifier,
        additional_data: request.metadata,
      });

      return {
        success: true,
        transactionId: response.data.payment_id || `apetiz_${Date.now()}`,
        amount: request.amount,
        status: "completed",
        message: "Payment processed successfully",
        metadata: response.data,
      };
    } catch (error: any) {
      logger.error("Apetiz payment error:", error);

      return {
        success: false,
        transactionId: "",
        amount: request.amount,
        status: "failed",
        message: error.message || "Payment processing failed",
        metadata: {
          error: error.response?.data || error.message,
        },
      };
    }
  }

  async getTransactionStatus(transactionId: string): Promise<VoucherPaymentResponse> {
    if (!this.isConfigured()) {
      throw new Error("Apetiz provider is not configured");
    }

    try {
      const response = await this.client.get(`/api/payments/${transactionId}`);

      return {
        success: response.data.status === "completed",
        transactionId: response.data.payment_id,
        amount: response.data.amount_cents / 100,
        status: response.data.status,
        metadata: response.data,
      };
    } catch (error: any) {
      logger.error("Apetiz transaction status error:", error);
      throw error;
    }
  }

  async refundTransaction(request: VoucherRefundRequest): Promise<VoucherRefundResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error("Apetiz provider is not configured");
      }

      logger.info(`Refunding Apetiz transaction ${request.transactionId}`);

      const response = await this.client.post(`/api/payments/${request.transactionId}/refund`, {
        amount_cents: request.amount ? Math.round(request.amount * 100) : undefined,
        refund_reason: request.reason,
      });

      return {
        success: true,
        refundId: response.data.refund_id || `apetiz_refund_${Date.now()}`,
        amount: request.amount || 0,
        status: "completed",
        message: "Refund processed successfully",
      };
    } catch (error: any) {
      logger.error("Apetiz refund error:", error);

      return {
        success: false,
        refundId: "",
        amount: request.amount || 0,
        status: "failed",
        message: error.message || "Refund processing failed",
      };
    }
  }
}
