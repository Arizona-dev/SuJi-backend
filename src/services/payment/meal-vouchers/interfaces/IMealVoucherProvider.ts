export interface VoucherPaymentRequest {
  orderId: string;
  amount: number;
  voucherCode?: string;
  userIdentifier?: string;
  metadata?: Record<string, any>;
}

export interface VoucherPaymentResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  message?: string;
  metadata?: Record<string, any>;
}

export interface VoucherRefundRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
}

export interface VoucherRefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  status: "completed" | "pending" | "failed";
  message?: string;
}

export interface IMealVoucherProvider {
  /**
   * Process a payment with the meal voucher provider
   */
  processPayment(request: VoucherPaymentRequest): Promise<VoucherPaymentResponse>;

  /**
   * Check the status of a transaction
   */
  getTransactionStatus(transactionId: string): Promise<VoucherPaymentResponse>;

  /**
   * Refund a transaction
   */
  refundTransaction(request: VoucherRefundRequest): Promise<VoucherRefundResponse>;

  /**
   * Verify if the provider is properly configured
   */
  isConfigured(): boolean;
}
