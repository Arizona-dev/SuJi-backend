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
import { MenuItem } from "./MenuItem";

@Entity("menus")
export class Menu {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Store, (store) => store.menus)
  store!: Store;

  @Column()
  storeId!: string;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.menu)
  items!: MenuItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
