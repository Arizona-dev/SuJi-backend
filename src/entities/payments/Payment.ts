import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Order } from "../orders/Order";

export enum PaymentMethod {
  STRIPE = "stripe",
  SWILE = "swile",
  EDENRED = "edenred",
  SODEXO = "sodexo",
  APETIZ = "apetiz",
  UP_DEJEUNER = "up_dejeuner",
  CASH = "cash",
}

export enum PaymentStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("decimal", { precision: 10, scale: 2 })
  amount!: number;

  @Column({
    type: "enum",
    enum: PaymentMethod,
  })
  method!: PaymentMethod;

  @Column({
    type: "enum",
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status!: PaymentStatus;

  @Column({ nullable: true })
  transactionId?: string;

  @Column({ nullable: true })
  externalId?: string;

  @ManyToOne(() => Order, (order) => order.payments)
  order!: Order;

  @Column()
  orderId!: string;

  @Column({ type: "json", nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
