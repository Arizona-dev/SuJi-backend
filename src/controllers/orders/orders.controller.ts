import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import {
  OrdersService,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  OrderHistoryFilters,
} from "../../services/orders/orders.service";
import { OrderStatus } from "../../entities/orders/Order";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";

export class OrdersController {
  private ordersService: OrdersService;

  constructor(dataSource: DataSource = AppDataSource) {
    this.ordersService = new OrdersService(dataSource);
  }

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const request: CreateOrderRequest = req.body;

      const order = await this.ordersService.createOrder(request);

      res.status(201).json({
        message: "Order created successfully",
        data: order,
      });
    } catch (error) {
      logger.error("Create order error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";

      if (
        errorMessage.includes("not found") ||
        errorMessage.includes("closed")
      ) {
        res.status(400).json({
          message: errorMessage,
        });
        return;
      }

      res.status(500).json({
        message: "Failed to create order",
        error: errorMessage,
      });
    }
  }

  async getOrdersForStore(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;

      const orders = await this.ordersService.getOrdersForStore(storeId);

      res.json({
        message: "Orders retrieved successfully",
        data: orders,
        count: orders.length,
      });
    } catch (error) {
      logger.error("Get orders for store error:", error);
      res.status(500).json({
        message: "Failed to retrieve orders",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const order = await this.ordersService.getOrderById(id);

      if (!order) {
        res.status(404).json({
          message: "Order not found",
        });
        return;
      }

      res.json({
        message: "Order retrieved successfully",
        data: order,
      });
    } catch (error) {
      logger.error("Get order by ID error:", error);
      res.status(500).json({
        message: "Failed to retrieve order",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const request: UpdateOrderStatusRequest = req.body;

      const order = await this.ordersService.updateOrderStatus(id, request);

      res.json({
        message: "Order status updated successfully",
        data: order,
      });
    } catch (error) {
      logger.error("Update order status error:", error);

      if (error instanceof Error && error.message === "Order not found") {
        res.status(404).json({
          message: "Order not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update order status",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getOrderHistory(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const { startDate, endDate, status, paymentMethod } = req.query;

      const filters: OrderHistoryFilters = {};

      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as OrderStatus;
      if (paymentMethod) filters.paymentMethod = paymentMethod as string;

      const result = await this.ordersService.getOrderHistory(storeId, filters);

      res.json({
        message: "Order history retrieved successfully",
        data: result.orders,
        summary: {
          totalRevenue: result.totalRevenue,
          orderCount: result.orderCount,
        },
      });
    } catch (error) {
      logger.error("Get order history error:", error);
      res.status(500).json({
        message: "Failed to retrieve order history",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async exportOrderHistory(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;
      const {
        startDate,
        endDate,
        status,
        paymentMethod,
        format = "csv",
      } = req.query;

      const filters: OrderHistoryFilters = {};

      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);
      if (status) filters.status = status as OrderStatus;
      if (paymentMethod) filters.paymentMethod = paymentMethod as string;

      const data = await this.ordersService.exportOrderHistory(
        storeId,
        filters
      );

      if (format === "csv") {
        // Convert to CSV
        if (data.length === 0) {
          res.setHeader("Content-Type", "text/csv");
          res.setHeader(
            "Content-Disposition",
            'attachment; filename="orders.csv"'
          );
          res.send("No orders found");
          return;
        }

        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(","),
          ...data.map((row) =>
            headers.map((header) => `"${row[header]}"`).join(",")
          ),
        ].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          'attachment; filename="orders.csv"'
        );
        res.send(csvContent);
      } else {
        res.json({
          message: "Order history exported successfully",
          data,
        });
      }
    } catch (error) {
      logger.error("Export order history error:", error);
      res.status(500).json({
        message: "Failed to export order history",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
