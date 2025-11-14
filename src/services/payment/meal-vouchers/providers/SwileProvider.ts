import axios, { AxiosInstance } from "axios";
import { logger } from "../../../../utils/logger";
import {
  IMealVoucherProvider,
  VoucherPaymentRequest,
  VoucherPaymentResponse,
  VoucherRefundRequest,
  VoucherRefundResponse,
} from "../interfaces/IMealVoucherProvider";

export class SwileProvider implements IMealVoucherProvider {
  private apiKey: string;
  private apiUrl: string;
  private client: AxiosInstance;

  constructor(apiKey?: string, apiUrl?: string) {
    this.apiKey = apiKey || process.env.SWILE_API_KEY || "";
    this.apiUrl = apiUrl || process.env.SWILE_API_URL || "https://api.swile.co";

    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
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
        throw new Error("Swile provider is not configured");
      }

      logger.info(`Processing Swile payment for order ${request.orderId}`);

      // Swile API integration
      // Note: This is a placeholder implementation
      // Actual API calls would be made here once API documentation is available
      const response = await this.client.post("/v1/payments", {
        order_id: request.orderId,
        amount: Math.round(request.amount * 100), // Convert to cents
        voucher_code: request.voucherCode,
        user_identifier: request.userIdentifier,
        metadata: request.metadata,
      });

      return {
        success: true,
        transactionId: response.data.transaction_id || `swile_${Date.now()}`,
        amount: request.amount,
        status: "completed",
        message: "Payment processed successfully",
        metadata: response.data,
      };
    } catch (error: any) {
      logger.error("Swile payment error:", error);

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
      throw new Error("Swile provider is not configured");
    }

    try {
      const response = await this.client.get(`/v1/payments/${transactionId}`);

      return {
        success: response.data.status === "completed",
        transactionId: response.data.transaction_id,
        amount: response.data.amount / 100, // Convert from cents
        status: response.data.status,
        metadata: response.data,
      };
    } catch (error: any) {
      logger.error("Swile transaction status error:", error);
      throw error;
    }
  }

  async refundTransaction(request: VoucherRefundRequest): Promise<VoucherRefundResponse> {
    try {
      if (!this.isConfigured()) {
        throw new Error("Swile provider is not configured");
      }

      logger.info(`Refunding Swile transaction ${request.transactionId}`);

      const response = await this.client.post(`/v1/payments/${request.transactionId}/refund`, {
        amount: request.amount ? Math.round(request.amount * 100) : undefined,
        reason: request.reason,
      });

      return {
        success: true,
        refundId: response.data.refund_id || `swile_refund_${Date.now()}`,
        amount: request.amount || 0,
        status: "completed",
        message: "Refund processed successfully",
      };
    } catch (error: any) {
      logger.error("Swile refund error:", error);

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
