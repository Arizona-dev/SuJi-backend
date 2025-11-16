import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Menu } from "./Menu";
import { MenuItem } from "./MenuItem";

@Entity("categories")
export class Category {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: "int", default: 0 })
  position!: number;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Menu, (menu) => menu.categories)
  menu!: Menu;

  @Column()
  menuId!: string;

  @OneToMany(() => MenuItem, (menuItem) => menuItem.category)
  items!: MenuItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
