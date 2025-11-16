import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Menu } from "./Menu";
import { Category } from "./Category";
import { Ingredient } from "./Ingredient";

@Entity("menu_items")
export class MenuItem {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column("decimal", { precision: 10, scale: 2 })
  price!: number;

  @Column({ nullable: true })
  imageUrl?: string;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Menu, (menu) => menu.items)
  menu!: Menu;

  @Column()
  menuId!: string;

  @ManyToOne(() => Category, (category) => category.items, { nullable: true })
  category?: Category;

  @Column({ nullable: true })
  categoryId?: string;

  @ManyToMany(() => Ingredient)
  @JoinTable({
    name: "menu_item_ingredients",
    joinColumn: { name: "menuItemId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "ingredientId", referencedColumnName: "id" },
  })
  ingredients!: Ingredient[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
