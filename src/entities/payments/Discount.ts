import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum DiscountType {
  PERCENTAGE = "percentage",
  FIXED = "fixed",
}

@Entity("discounts")
export class Discount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  code!: string;

  @Column({
    type: "enum",
    enum: DiscountType,
  })
  type!: DiscountType;

  @Column("decimal", { precision: 10, scale: 2 })
  value!: number;

  @Column({ nullable: true })
  maxUses?: number;

  @Column({ default: 0 })
  usedCount!: number;

  @Column({ type: "timestamp", nullable: true })
  expiresAt?: Date;

  @Column({ default: true })
  isActive!: boolean;

  @Column()
  storeId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
