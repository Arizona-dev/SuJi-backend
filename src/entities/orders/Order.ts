import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Store } from "../stores/Store";
import { User } from "../auth/User";
import { OrderItem } from "./OrderItem";
import { Payment } from "../payments/Payment";

export enum OrderStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  PREPARING = "preparing",
  READY = "ready",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  orderNumber!: string;

  @Column({
    type: "enum",
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status!: OrderStatus;

  @Column("decimal", { precision: 10, scale: 2 })
  totalAmount!: number;

  @Column("decimal", { precision: 10, scale: 2, default: 0 })
  discountAmount!: number;

  @Column({ type: "timestamp" })
  scheduledTime!: Date;

  @Column({ nullable: true })
  chefNotes?: string;

  @ManyToOne(() => Store, (store) => store.orders)
  store!: Store;

  @Column()
  storeId!: string;

  @ManyToOne(() => User)
  customer!: User;

  @Column()
  customerId!: string;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.order)
  items!: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments!: Payment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
