import { Router } from "express";
import { body, query } from "express-validator";
import { OrdersController } from "../../controllers/orders/orders.controller";
import { OrderStatus } from "../../entities/orders/Order";
import { DataSource } from "typeorm";

export function createOrderRoutes(dataSource?: DataSource): Router {
  const router: Router = Router();
  const ordersController = new OrdersController(dataSource);

  /**
   * @swagger
   * /api/orders:
   *   post:
   *     summary: Create a new order
   *     tags: [Orders]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - storeId
   *               - customerId
   *               - scheduledTime
   *               - items
   *             properties:
   *               storeId:
   *                 type: string
   *                 description: ID of the store
   *               customerId:
   *                 type: string
   *                 description: ID of the customer
   *               scheduledTime:
   *                 type: string
   *                 format: date-time
   *                 description: When the order should be ready
   *               items:
   *                 type: array
   *                 minItems: 1
   *                 items:
   *                   type: object
   *                   required:
   *                     - menuItemId
   *                     - quantity
   *                   properties:
   *                     menuItemId:
   *                       type: string
   *                       description: ID of the menu item
   *                     quantity:
   *                       type: integer
   *                       minimum: 1
   *                       maximum: 99
   *                     customizations:
   *                       type: object
   *                       description: Customizations for the menu item
   *               chefNotes:
   *                 type: string
   *                 maxLength: 500
   *                 description: Special notes for the chef
   *     responses:
   *       201:
   *         description: Order created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *       400:
   *         description: Invalid input data or store closed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.post(
    "/",
    [
      body("storeId").isUUID(),
      body("customerId").isUUID(),
      body("scheduledTime").isISO8601(),
      body("items").isArray({ min: 1 }),
      body("items.*.menuItemId").isUUID(),
      body("items.*.quantity").isInt({ min: 1, max: 99 }),
      body("items.*.customizations").optional().isObject(),
      body("chefNotes").optional().trim().isLength({ max: 500 }),
    ],
    ordersController.createOrder.bind(ordersController)
  );

  /**
   * @swagger
   * /api/orders/store/{storeId}:
   *   get:
   *     summary: Get all orders for a store
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *         description: Store ID
   *     responses:
   *       200:
   *         description: Orders retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Order'
   *                 count:
   *                   type: integer
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    "/store/:storeId",
    ordersController.getOrdersForStore.bind(ordersController)
  );

  /**
   * @swagger
   * /api/orders/{id}:
   *   get:
   *     summary: Get order by ID
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Order ID
   *     responses:
   *       200:
   *         description: Order retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *       404:
   *         description: Order not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get("/:id", ordersController.getOrderById.bind(ordersController));

  /**
   * @swagger
   * /api/orders/{id}/status:
   *   put:
   *     summary: Update order status
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Order ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - status
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [pending, confirmed, preparing, ready, completed, cancelled]
   *                 description: New order status
   *     responses:
   *       200:
   *         description: Order status updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   $ref: '#/components/schemas/Order'
   *       400:
   *         description: Invalid status
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       404:
   *         description: Order not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.put(
    "/:id/status",
    [
      body("status").isIn([
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ]),
    ],
    ordersController.updateOrderStatus.bind(ordersController)
  );

  /**
   * @swagger
   * /api/orders/history/store/{storeId}:
   *   get:
   *     summary: Get order history for a store with optional filters
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *         description: Store ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (YYYY-MM-DD)
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, confirmed, preparing, ready, completed, cancelled]
   *         description: Filter by order status
   *       - in: query
   *         name: paymentMethod
   *         schema:
   *           type: string
   *           enum: [stripe, swile, edenred, sodexo, apetiz, up_dejeuner, cash]
   *         description: Filter by payment method
   *     responses:
   *       200:
   *         description: Order history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Order'
   *                 summary:
   *                   type: object
   *                   properties:
   *                     totalRevenue:
   *                       type: number
   *                       description: Total revenue for the filtered period
   *                     orderCount:
   *                       type: integer
   *                       description: Number of orders in the filtered period
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    "/history/store/:storeId",
    ordersController.getOrderHistory.bind(ordersController)
  );

  /**
   * @swagger
   * /api/orders/history/export/{storeId}:
   *   get:
   *     summary: Export order history as CSV
   *     tags: [Orders]
   *     parameters:
   *       - in: path
   *         name: storeId
   *         required: true
   *         schema:
   *           type: string
   *         description: Store ID
   *       - in: query
   *         name: startDate
   *         schema:
   *           type: string
   *           format: date
   *         description: Start date for filtering (YYYY-MM-DD)
   *       - in: query
   *         name: endDate
   *         schema:
   *           type: string
   *           format: date
   *         description: End date for filtering (YYYY-MM-DD)
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, confirmed, preparing, ready, completed, cancelled]
   *         description: Filter by order status
   *       - in: query
   *         name: paymentMethod
   *         schema:
   *           type: string
   *           enum: [stripe, swile, edenred, sodexo, apetiz, up_dejeuner, cash]
   *         description: Filter by payment method
   *       - in: query
   *         name: format
   *         schema:
   *           type: string
   *           enum: [csv, json]
   *           default: csv
   *         description: Export format
   *     responses:
   *       200:
   *         description: Order history exported successfully
   *         content:
   *           text/csv:
   *             schema:
   *               type: string
   *             example: orderNumber,status,totalAmount,scheduledTime,createdAt,customerName,paymentMethods,itemCount
   *       500:
   *         description: Server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Error'
   */
  router.get(
    "/history/export/:storeId",
    ordersController.exportOrderHistory.bind(ordersController)
  );

  return router;
}

// For backward compatibility
const defaultRouter = createOrderRoutes();
export default defaultRouter;
