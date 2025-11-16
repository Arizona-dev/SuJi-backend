import { DataSource } from "typeorm";
import { User } from "../entities/auth/User";
import { Store } from "../entities/stores/Store";
import { Menu } from "../entities/menus/Menu";
import { MenuItem } from "../entities/menus/MenuItem";
import { Category } from "../entities/menus/Category";
import { Ingredient } from "../entities/menus/Ingredient";
import { Order } from "../entities/orders/Order";
import { OrderItem } from "../entities/orders/OrderItem";
import { Payment } from "../entities/payments/Payment";
import { Discount } from "../entities/payments/Discount";
import { AuditLog } from "../entities/audit/AuditLog";
import { Asset } from "../entities/assets/Asset";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "suji",
  synchronize: process.env.NODE_ENV !== "production", // Use migrations in production
  logging: process.env.NODE_ENV === "development",
  entities: [
    User,
    Store,
    Menu,
    MenuItem,
    Category,
    Ingredient,
    Order,
    OrderItem,
    Payment,
    Discount,
    AuditLog,
    Asset,
  ],
  migrations: ["src/migrations/*.ts"],
  subscribers: ["src/subscribers/*.ts"],
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
