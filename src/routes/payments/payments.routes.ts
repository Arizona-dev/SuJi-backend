import { Router, Request, Response } from "express";
import { PaymentsController } from "../../controllers/payments/payments.controller";
import { body, param } from "express-validator";

const router: Router = Router();
const paymentsController = new PaymentsController();

// Payment processing routes
router.post(
  "/create-intent",
  [
    body("orderId").isUUID().withMessage("Valid order ID is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Valid amount is required"),
    body("paymentMethod")
      .isIn(["card", "meal_voucher", "cash"])
      .withMessage("Valid payment method is required"),
  ],
  (req: Request, res: Response) => paymentsController.createPaymentIntent(req, res)
);

router.post(
  "/confirm",
  [
    body("paymentId").isUUID().withMessage("Valid payment ID is required"),
    body("paymentIntentId").optional().isString(),
  ],
  (req: Request, res: Response) => paymentsController.confirmPayment(req, res)
);

// Stripe webhook (raw body required)
router.post("/stripe/webhook", (req: Request, res: Response) =>
  paymentsController.handleStripeWebhook(req, res)
);

// Get payments by order
router.get("/order/:orderId", [param("orderId").isUUID()], (req: Request, res: Response) =>
  paymentsController.getPaymentByOrderId(req, res)
);

// Refund payment
router.post(
  "/refund/:paymentId",
  [
    param("paymentId").isUUID(),
    body("amount").optional().isFloat({ min: 0 }),
    body("reason").optional().isString(),
  ],
  (req: Request, res: Response) => paymentsController.refundPayment(req, res)
);

// Meal voucher processing
router.post(
  "/meal-voucher",
  [
    body("orderId").isUUID().withMessage("Valid order ID is required"),
    body("provider")
      .isIn(["swile", "edenred", "sodexo", "apetiz", "up_dejeuner"])
      .withMessage("Valid provider is required"),
    body("voucherDetails").isObject(),
  ],
  (req: Request, res: Response) => paymentsController.processeMealVoucher(req, res)
);

// Cash payment
router.post(
  "/cash",
  [
    body("orderId").isUUID().withMessage("Valid order ID is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Valid amount is required"),
  ],
  (req: Request, res: Response) => paymentsController.markCashPayment(req, res)
);

export default router;
