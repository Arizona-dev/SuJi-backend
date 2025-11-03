import {
  DataSource,
  Repository,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
} from "typeorm";
import { Order, OrderStatus } from "../../entities/orders/Order";
import { OrderItem } from "../../entities/orders/OrderItem";
import { Store } from "../../entities/stores/Store";
import { User } from "../../entities/auth/User";
import { MenuItem } from "../../entities/menus/MenuItem";
import { Payment } from "../../entities/payments/Payment";
import { logger } from "../../utils/logger";

export interface CreateOrderRequest {
  storeId: string;
  customerId: string;
  scheduledTime: Date;
  items: Array<{
    menuItemId: string;
    quantity: number;
    customizations?: Record<string, any>;
  }>;
  chefNotes?: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface OrderHistoryFilters {
  startDate?: Date;
  endDate?: Date;
  status?: OrderStatus;
  paymentMethod?: string;
}

export class OrdersService {
  private orderRepository: Repository<Order>;
  private orderItemRepository: Repository<OrderItem>;
  private storeRepository: Repository<Store>;
  private userRepository: Repository<User>;
  private menuItemRepository: Repository<MenuItem>;
  private paymentRepository: Repository<Payment>;

  constructor(private dataSource: DataSource) {
    this.orderRepository = this.dataSource.getRepository(Order);
    this.orderItemRepository = this.dataSource.getRepository(OrderItem);
    this.storeRepository = this.dataSource.getRepository(Store);
    this.userRepository = this.dataSource.getRepository(User);
    this.menuItemRepository = this.dataSource.getRepository(MenuItem);
    this.paymentRepository = this.dataSource.getRepository(Payment);
  }

  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Verify store exists and is not on holiday
      const store = await this.storeRepository.findOne({
        where: { id: request.storeId, isActive: true },
      });

      if (!store) {
        throw new Error("Store not found");
      }

      if (store.isHoliday) {
        throw new Error("Store is currently closed for holidays");
      }

      // Verify customer exists
      const customer = await this.userRepository.findOne({
        where: { id: request.customerId, isActive: true },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Calculate total and create order items
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      for (const item of request.items) {
        const menuItem = await this.menuItemRepository.findOne({
          where: { id: item.menuItemId, isActive: true },
        });

        if (!menuItem) {
          throw new Error(`Menu item ${item.menuItemId} not found`);
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        const orderItem = this.orderItemRepository.create({
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          customizations: item.customizations,
        });

        orderItems.push(orderItem);
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber(request.storeId);

      // Create order
      const order = this.orderRepository.create({
        orderNumber,
        totalAmount,
        scheduledTime: request.scheduledTime,
        chefNotes: request.chefNotes,
        status: OrderStatus.PENDING,
        storeId: request.storeId,
        customerId: request.customerId,
        items: orderItems,
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      logger.info(
        `Order created: ${savedOrder.id} for store: ${request.storeId}`
      );

      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      logger.error("Error creating order:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getOrdersForStore(storeId: string): Promise<Order[]> {
    return await this.orderRepository.find({
      where: { storeId },
      relations: ["customer", "items", "payments"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  async getOrderById(id: string): Promise<Order | null> {
    return await this.orderRepository.findOne({
      where: { id },
      relations: ["store", "customer", "items", "payments"],
    });
  }

  async updateOrderStatus(
    id: string,
    request: UpdateOrderStatusRequest
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ["store", "customer"],
    });

    if (!order) {
      throw new Error("Order not found");
    }

    order.status = request.status;
    const updatedOrder = await this.orderRepository.save(order);

    logger.info(`Order ${id} status updated to: ${request.status}`);

    return updatedOrder;
  }

  async getOrderHistory(
    storeId: string,
    filters: OrderHistoryFilters = {}
  ): Promise<{ orders: Order[]; totalRevenue: number; orderCount: number }> {
    const whereConditions: any = { storeId };

    if (filters.startDate && filters.endDate) {
      whereConditions.createdAt = Between(filters.startDate, filters.endDate);
    } else if (filters.startDate) {
      whereConditions.createdAt = MoreThanOrEqual(filters.startDate);
    } else if (filters.endDate) {
      whereConditions.createdAt = LessThanOrEqual(filters.endDate);
    }

    if (filters.status) {
      whereConditions.status = filters.status;
    }

    const orders = await this.orderRepository.find({
      where: whereConditions,
      relations: ["items", "payments"],
      order: {
        createdAt: "DESC",
      },
    });

    // Calculate totals
    let totalRevenue = 0;
    let orderCount = orders.length;

    // Filter by payment method if specified
    if (filters.paymentMethod) {
      const filteredOrders = orders.filter((order) =>
        order.payments.some(
          (payment) => payment.method === filters.paymentMethod
        )
      );
      totalRevenue = filteredOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0
      );
      orderCount = filteredOrders.length;
    } else {
      totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    }

    return { orders, totalRevenue, orderCount };
  }

  async exportOrderHistory(
    storeId: string,
    filters: OrderHistoryFilters = {}
  ): Promise<any[]> {
    const { orders } = await this.getOrderHistory(storeId, filters);

    // Transform for CSV export
    return orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      scheduledTime: order.scheduledTime.toISOString(),
      createdAt: order.createdAt.toISOString(),
      customerName: `${order.customer?.firstName || ""} ${
        order.customer?.lastName || ""
      }`.trim(),
      paymentMethods: order.payments.map((p) => p.method).join(", "),
      itemCount: order.items.length,
    }));
  }

  private async generateOrderNumber(storeId: string): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = now.toISOString().slice(11, 19).replace(/:/g, "");

    // Get store short ID (first 4 characters)
    const storeShortId = storeId.slice(0, 4).toUpperCase();

    // Get sequence number for today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const todaysOrders = await this.orderRepository.count({
      where: {
        storeId,
        createdAt: Between(startOfDay, endOfDay),
      },
    });

    const sequence = (todaysOrders + 1).toString().padStart(4, "0");

    return `${storeShortId}${dateStr}${sequence}`;
  }
}
