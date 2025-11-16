import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Store } from "../stores/Store";

@Entity("assets")
export class Asset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  storeId!: string;

  @ManyToOne(() => Store, { onDelete: "CASCADE" })
  @JoinColumn({ name: "storeId" })
  store!: Store;

  @Column()
  filename!: string;

  @Column()
  url!: string;

  @Column()
  mimeType!: string;

  @Column({ type: "bigint" })
  size!: number;

  @Column({ type: "simple-array", nullable: true })
  tags?: string[];

  @Column({ default: 0 })
  usageCount!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
