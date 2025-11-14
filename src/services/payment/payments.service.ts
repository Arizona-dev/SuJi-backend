import { DataSource, Repository } from "typeorm";
import Stripe from "stripe";
import { Payment, PaymentStatus, PaymentMethod } from "../../entities/payments/Payment";
import { Order } from "../../entities/orders/Order";
import { logger } from "../../utils/logger";

export interface CreatePaymentIntentRequest {
  orderId: string;
  amount: number;
  paymentMethod: "card" | "meal_voucher" | "cash";
}

export interface ProcessMealVoucherRequest {
  orderId: string;
  provider: "swile" | "edenred" | "sodexo" | "apetiz" | "up_dejeuner";
  voucherDetails: any;
}

export class PaymentsService {
  private paymentRepository: Repository<Payment>;
  private orderRepository: Repository<Order>;
  private stripe: Stripe;

  constructor(dataSource: DataSource) {
    this.paymentRepository = dataSource.getRepository(Payment);
    this.orderRepository = dataSource.getRepository(Order);
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  }

  async createPaymentIntent(
    orderId: string,
    amount: number,
    paymentMethod: string
  ): Promise<any> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      if (paymentMethod === "card") {
        const paymentIntent = await this.stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "eur",
          metadata: {
            orderId,
          },
        });

        const payment = this.paymentRepository.create({
          order,
          orderId: order.id,
          amount,
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PENDING,
          externalId: paymentIntent.id,
          metadata: {
            clientSecret: paymentIntent.client_secret,
          },
        });

        await this.paymentRepository.save(payment);

        return {
          paymentId: payment.id,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      }

      const payment = this.paymentRepository.create({
        order,
        orderId: order.id,
        amount,
        method: paymentMethod === "cash" ? PaymentMethod.CASH : PaymentMethod.STRIPE,
        status: PaymentStatus.PENDING,
      });

      await this.paymentRepository.save(payment);

      return {
        paymentId: payment.id,
        method: paymentMethod,
      };
    } catch (error) {
      logger.error("Create payment intent error:", error);
      throw error;
    }
  }

  async confirmPayment(
    paymentId: string,
    paymentIntentId?: string
  ): Promise<Payment> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
        relations: ["order"],
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.method === PaymentMethod.STRIPE && paymentIntentId) {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(
          paymentIntentId
        );

        if (paymentIntent.status === "succeeded") {
          payment.status = PaymentStatus.COMPLETED;
          payment.metadata = {
            ...payment.metadata,
            paidAt: new Date(),
          };
        } else {
          payment.status = PaymentStatus.FAILED;
        }
      } else {
        payment.status = PaymentStatus.COMPLETED;
        payment.metadata = {
          ...payment.metadata,
          paidAt: new Date(),
        };
      }

      await this.paymentRepository.save(payment);

      if (payment.status === PaymentStatus.COMPLETED && payment.order) {
        // Update order status if needed
        payment.order.status = "confirmed" as any;
        await this.orderRepository.save(payment.order);
      }

      return payment;
    } catch (error) {
      logger.error("Confirm payment error:", error);
      throw error;
    }
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<void> {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret
      );

      switch (event.type) {
        case "payment_intent.succeeded":
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentIntentSucceeded(paymentIntent);
          break;
        case "payment_intent.payment_failed":
          const failedIntent = event.data.object as Stripe.PaymentIntent;
          await this.handlePaymentIntentFailed(failedIntent);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error("Stripe webhook error:", error);
      throw error;
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { externalId: paymentIntent.id },
      relations: ["order"],
    });

    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      payment.metadata = {
        ...payment.metadata,
        paidAt: new Date(),
      };
      await this.paymentRepository.save(payment);

      if (payment.order) {
        payment.order.status = "confirmed" as any;
        await this.orderRepository.save(payment.order);
      }
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const payment = await this.paymentRepository.findOne({
      where: { externalId: paymentIntent.id },
    });

    if (payment) {
      payment.status = PaymentStatus.FAILED;
      payment.metadata = {
        ...payment.metadata,
        failureReason: paymentIntent.last_payment_error?.message,
      };
      await this.paymentRepository.save(payment);
    }
  }

  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    return await this.paymentRepository.find({
      where: { order: { id: orderId } },
      order: { createdAt: "DESC" },
    });
  }

  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string
  ): Promise<Payment> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error("Payment not found");
      }

      if (payment.method === PaymentMethod.STRIPE && payment.externalId) {
        const refund = await this.stripe.refunds.create({
          payment_intent: payment.externalId,
          amount: amount ? Math.round(amount * 100) : undefined,
          reason: reason as Stripe.RefundCreateParams.Reason,
        });

        payment.status = PaymentStatus.REFUNDED;
        payment.metadata = {
          ...payment.metadata,
          refundedAt: new Date(),
          refundAmount: (refund.amount / 100) || payment.amount,
          refundId: refund.id,
          refundReason: reason,
        };
      } else {
        payment.status = PaymentStatus.REFUNDED;
        payment.metadata = {
          ...payment.metadata,
          refundedAt: new Date(),
          refundAmount: amount || payment.amount,
          refundReason: reason,
        };
      }

      await this.paymentRepository.save(payment);
      return payment;
    } catch (error) {
      logger.error("Refund payment error:", error);
      throw error;
    }
  }

  async processMealVoucher(
    orderId: string,
    provider: string,
    voucherDetails: any
  ): Promise<Payment> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const payment = this.paymentRepository.create({
        order,
        orderId: order.id,
        amount: order.totalAmount,
        method: this.getMealVoucherMethod(provider),
        status: PaymentStatus.PENDING,
        metadata: {
          provider,
          voucherDetails,
        },
      });

      await this.paymentRepository.save(payment);

      switch (provider) {
        case "swile":
          break;
        case "edenred":
          break;
        case "sodexo":
          break;
        case "apetiz":
          break;
        case "up_dejeuner":
          break;
        default:
          logger.warn(`Unknown meal voucher provider: ${provider}`);
      }

      payment.status = PaymentStatus.COMPLETED;
      payment.metadata = {
        ...payment.metadata,
        paidAt: new Date(),
      };
      await this.paymentRepository.save(payment);

      order.status = "confirmed" as any;
      await this.orderRepository.save(order);

      return payment;
    } catch (error) {
      logger.error("Process meal voucher error:", error);
      throw error;
    }
  }

  async markCashPayment(orderId: string, amount: number): Promise<Payment> {
    try {
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error("Order not found");
      }

      const payment = this.paymentRepository.create({
        order,
        orderId: order.id,
        amount,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PENDING,
      });

      await this.paymentRepository.save(payment);

      return payment;
    } catch (error) {
      logger.error("Mark cash payment error:", error);
      throw error;
    }
  }

  private getMealVoucherMethod(provider: string): PaymentMethod {
    switch (provider) {
      case "swile":
        return PaymentMethod.SWILE;
      case "edenred":
        return PaymentMethod.EDENRED;
      case "sodexo":
        return PaymentMethod.SODEXO;
      case "apetiz":
        return PaymentMethod.APETIZ;
      case "up_dejeuner":
        return PaymentMethod.UP_DEJEUNER;
      default:
        return PaymentMethod.STRIPE;
    }
  }
}