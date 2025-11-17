import { DataSource, Repository, In } from "typeorm";
import { Menu } from "../../entities/menus/Menu";
import { MenuItem } from "../../entities/menus/MenuItem";
import { Category } from "../../entities/menus/Category";
import { Ingredient } from "../../entities/menus/Ingredient";
import { Store } from "../../entities/stores/Store";
import { logger } from "../../utils/logger";

export interface CreateMenuRequest {
  name: string;
  description?: string;
  storeId: string;
}

export interface UpdateMenuRequest {
  name?: string;
  description?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  menuId: string;
  position?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  position?: number;
}

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  categoryId?: string;
  isActive?: boolean;
  menuId: string;
  ingredientIds?: string[];
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  categoryId?: string;
  isActive?: boolean;
  position?: number;
  ingredientIds?: string[];
}

export interface UpdateIngredientRequest {
  name?: string;
  description?: string;
  isAvailable?: boolean;
  disabledUntil?: Date;
}

export class MenusService {
  private menuRepository: Repository<Menu>;
  private menuItemRepository: Repository<MenuItem>;
  private categoryRepository: Repository<Category>;
  private ingredientRepository: Repository<Ingredient>;
  private storeRepository: Repository<Store>;

  constructor(private dataSource: DataSource) {
    this.menuRepository = this.dataSource.getRepository(Menu);
    this.menuItemRepository = this.dataSource.getRepository(MenuItem);
    this.categoryRepository = this.dataSource.getRepository(Category);
    this.ingredientRepository = this.dataSource.getRepository(Ingredient);
    this.storeRepository = this.dataSource.getRepository(Store);
  }

  async getMenuForStore(storeId: string): Promise<Menu> {
    // Try to find existing menu using QueryBuilder to properly order categories
    let menu = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.storeId = :storeId", { storeId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .orderBy("categories.position", "ASC")
      .addOrderBy("menu.createdAt", "ASC")
      .getOne();

    // If no menu exists, create one automatically
    if (!menu) {
      logger.info(`No menu found for store ${storeId}, creating one...`);

      // Verify store exists
      const store = await this.storeRepository.findOne({
        where: { id: storeId, isActive: true },
      });

      if (!store) {
        throw new Error("Store not found");
      }

      menu = this.menuRepository.create({
        storeId,
        name: `Menu ${store.name}`,
        description: "Menu principal",
        isActive: true,
        items: [],
      });

      menu = await this.menuRepository.save(menu);
      logger.info(`Menu auto-created: ${menu.id} for store: ${storeId}`);
    }

    return menu;
  }

  async createMenu(request: CreateMenuRequest): Promise<Menu> {
    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: request.storeId, isActive: true },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    const menu = this.menuRepository.create({
      ...request,
      isActive: true,
    });

    const savedMenu = await this.menuRepository.save(menu);

    logger.info(`Menu created: ${savedMenu.id} for store: ${request.storeId}`);

    return savedMenu;
  }

  async updateMenu(id: string, request: UpdateMenuRequest): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id, isActive: true },
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    Object.assign(menu, request);

    const updatedMenu = await this.menuRepository.save(menu);

    logger.info(`Menu updated: ${id}`);

    return updatedMenu;
  }

  async deleteMenu(id: string): Promise<void> {
    const menu = await this.menuRepository.findOne({
      where: { id, isActive: true },
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    menu.isActive = false;
    await this.menuRepository.save(menu);

    logger.info(`Menu deactivated: ${id}`);
  }

  async createMenuItem(request: CreateMenuItemRequest): Promise<Menu> {
    // Verify menu exists
    const menu = await this.menuRepository.findOne({
      where: { id: request.menuId, isActive: true },
      relations: ["items", "items.ingredients"],
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    // Load ingredients if provided
    let ingredients: Ingredient[] = [];
    if (request.ingredientIds && request.ingredientIds.length > 0) {
      ingredients = await this.ingredientRepository.find({
        where: { id: In(request.ingredientIds) },
      });
      if (ingredients.length !== request.ingredientIds.length) {
        throw new Error("One or more ingredients not found");
      }
    }

    const menuItem = this.menuItemRepository.create({
      name: request.name,
      description: request.description,
      price: request.price,
      imageUrl: request.imageUrl,
      categoryId: request.categoryId,
      menuId: request.menuId,
      isActive: request.isActive !== undefined ? request.isActive : true,
      ingredients,
    });

    await this.menuItemRepository.save(menuItem);

    logger.info(
      `Menu item created: ${menuItem.id} for menu: ${request.menuId}`
    );

    // Return the full menu with updated items (excluding soft-deleted items)
    const updatedMenuWithItems = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.id = :menuId", { menuId: request.menuId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .getOne();

    return updatedMenuWithItems as Menu;
  }

  async updateMenuItem(
    id: string,
    request: UpdateMenuItemRequest
  ): Promise<Menu> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id },
      relations: ["ingredients"],
    });

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    // Update basic fields
    if (request.name !== undefined) menuItem.name = request.name;
    if (request.description !== undefined)
      menuItem.description = request.description;
    if (request.price !== undefined) menuItem.price = request.price;
    if (request.imageUrl !== undefined) menuItem.imageUrl = request.imageUrl;
    if (request.categoryId !== undefined) menuItem.categoryId = request.categoryId;
    if (request.isActive !== undefined) menuItem.isActive = request.isActive;
    if (request.position !== undefined) menuItem.position = request.position;

    // Update ingredients if provided
    if (request.ingredientIds !== undefined) {
      if (request.ingredientIds.length > 0) {
        const ingredients = await this.ingredientRepository.find({
          where: { id: In(request.ingredientIds) },
        });
        if (ingredients.length !== request.ingredientIds.length) {
          throw new Error("One or more ingredients not found");
        }
        menuItem.ingredients = ingredients;
      } else {
        menuItem.ingredients = [];
      }
    }

    await this.menuItemRepository.save(menuItem);

    logger.info(`Menu item updated: ${id}`);

    // Return the full menu with updated items (excluding soft-deleted items)
    const updatedMenuWithItems = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.id = :menuId", { menuId: menuItem.menuId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .getOne();

    return updatedMenuWithItems as Menu;
  }

  async deleteMenuItem(id: string): Promise<Menu> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id },
    });

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    const menuId = menuItem.menuId;

    // Set isActive to false as a safety measure before soft deleting
    menuItem.isActive = false;
    await this.menuItemRepository.save(menuItem);

    // Soft delete the menu item
    await this.menuItemRepository.softDelete(id);

    logger.info(`Menu item soft deleted: ${id}`);

    // Return the full menu with updated items (excluding soft-deleted items)
    const updatedMenuWithItems = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.id = :menuId", { menuId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .getOne();

    return updatedMenuWithItems as Menu;
  }

  // Category methods

  async getCategoriesForMenu(menuId: string): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { menuId, isActive: true },
      relations: ["items"],
      order: {
        position: "ASC",
      },
    });
  }

  async createCategory(request: CreateCategoryRequest): Promise<Category> {
    // Verify menu exists
    const menu = await this.menuRepository.findOne({
      where: { id: request.menuId, isActive: true },
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    // If no position specified, put it at the end
    let position = request.position;
    if (position === undefined) {
      const maxPosition = await this.categoryRepository
        .createQueryBuilder("category")
        .where("category.menuId = :menuId", { menuId: request.menuId })
        .andWhere("category.isActive = :isActive", { isActive: true })
        .select("MAX(category.position)", "max")
        .getRawOne();
      position = (maxPosition?.max ?? -1) + 1;
    }

    const category = this.categoryRepository.create({
      name: request.name,
      description: request.description,
      menuId: request.menuId,
      position,
      isActive: true,
    });

    const savedCategory = await this.categoryRepository.save(category);

    logger.info(`Category created: ${savedCategory.id} for menu: ${request.menuId}`);

    return savedCategory;
  }

  async updateCategory(id: string, request: UpdateCategoryRequest): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    if (request.name !== undefined) category.name = request.name;
    if (request.description !== undefined) category.description = request.description;
    if (request.position !== undefined) category.position = request.position;

    const updatedCategory = await this.categoryRepository.save(category);

    logger.info(`Category updated: ${id}`);

    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id, isActive: true },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Set all menu items in this category to inactive and remove category
    await this.menuItemRepository
      .createQueryBuilder()
      .update(MenuItem)
      .set({ categoryId: null, isActive: false })
      .where("categoryId = :categoryId", { categoryId: id })
      .execute();

    category.isActive = false;
    await this.categoryRepository.save(category);

    logger.info(`Category deactivated: ${id}`);
  }

  async updateCategoryPositions(menuId: string, categoryPositions: { id: string; position: number }[]): Promise<void> {
    for (const { id, position } of categoryPositions) {
      await this.categoryRepository
        .createQueryBuilder()
        .update(Category)
        .set({ position })
        .where("id = :id", { id })
        .andWhere("menuId = :menuId", { menuId })
        .execute();
    }

    logger.info(`Category positions updated for menu: ${menuId}`);
  }

  async updateMenuItemPositions(menuId: string, itemPositions: { id: string; position: number }[]): Promise<Menu> {
    // Update all menu item positions in batch
    for (const { id, position } of itemPositions) {
      await this.menuItemRepository
        .createQueryBuilder()
        .update(MenuItem)
        .set({ position })
        .where("id = :id", { id })
        .andWhere("menuId = :menuId", { menuId })
        .execute();
    }

    logger.info(`Menu item positions updated for menu: ${menuId}, ${itemPositions.length} items`);

    // Reload and return the menu with updated positions
    const updatedMenu = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.id = :menuId", { menuId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .orderBy("categories.position", "ASC")
      .addOrderBy("items.position", "ASC")
      .getOne();

    return updatedMenu as Menu;
  }

  async getIngredientsForStore(storeId: string): Promise<Ingredient[]> {
    return await this.ingredientRepository.find({
      where: { storeId, isActive: true },
      order: {
        name: "ASC",
      },
    });
  }

  async createIngredient(
    name: string,
    description: string | undefined,
    storeId: string
  ): Promise<Ingredient> {
    const ingredient = this.ingredientRepository.create({
      name,
      description,
      storeId,
      isActive: true,
    });

    const savedIngredient = await this.ingredientRepository.save(ingredient);

    logger.info(
      `Ingredient created: ${savedIngredient.id} for store: ${storeId}`
    );

    return savedIngredient;
  }

  async disableIngredient(id: string, until?: Date): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    ingredient.disabledUntil = until;
    const updatedIngredient = await this.ingredientRepository.save(ingredient);

    logger.info(
      `Ingredient disabled: ${id} until ${
        until?.toISOString() || "indefinitely"
      }`
    );

    return updatedIngredient;
  }

  async enableIngredient(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    ingredient.disabledUntil = undefined;
    const updatedIngredient = await this.ingredientRepository.save(ingredient);

    logger.info(`Ingredient enabled: ${id}`);

    return updatedIngredient;
  }

  async updateIngredient(
    id: string,
    request: UpdateIngredientRequest
  ): Promise<Ingredient> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    // Update fields
    if (request.name !== undefined) ingredient.name = request.name;
    if (request.description !== undefined)
      ingredient.description = request.description;
    if (request.isAvailable !== undefined)
      ingredient.isAvailable = request.isAvailable;
    if (request.disabledUntil !== undefined)
      ingredient.disabledUntil = request.disabledUntil;

    const updatedIngredient = await this.ingredientRepository.save(ingredient);

    logger.info(`Ingredient updated: ${id}`);

    return updatedIngredient;
  }

  async deleteIngredient(id: string): Promise<void> {
    const ingredient = await this.ingredientRepository.findOne({
      where: { id, isActive: true },
    });

    if (!ingredient) {
      throw new Error("Ingredient not found");
    }

    ingredient.isActive = false;
    await this.ingredientRepository.save(ingredient);

    logger.info(`Ingredient deactivated: ${id}`);
  }

  async bulkUpdateIngredients(
    ingredientIds: string[],
    updates: Partial<Ingredient>
  ): Promise<Ingredient[]> {
    // Update all ingredients in bulk
    await this.ingredientRepository
      .createQueryBuilder()
      .update(Ingredient)
      .set(updates)
      .where("id IN (:...ingredientIds)", { ingredientIds })
      .andWhere("isActive = :isActive", { isActive: true })
      .execute();

    logger.info(`Bulk updated ${ingredientIds.length} ingredients`);

    // Return updated ingredients
    const updatedIngredients = await this.ingredientRepository.find({
      where: { id: In(ingredientIds) },
    });

    return updatedIngredients;
  }

  async bulkUpdateMenuItems(
    menuId: string,
    itemIds: string[],
    updates: Partial<MenuItem>
  ): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id: menuId, isActive: true },
      relations: ["items", "items.category", "categories"],
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    // Update all menu items in bulk using query builder for efficiency
    await this.menuItemRepository
      .createQueryBuilder()
      .update(MenuItem)
      .set(updates)
      .where("id IN (:...itemIds)", { itemIds })
      .andWhere("menuId = :menuId", { menuId })
      .execute();

    logger.info(`Bulk updated ${itemIds.length} menu items in menu: ${menuId}`);

    // Reload the menu with updated items (excluding soft-deleted items)
    const updatedMenu = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.id = :menuId", { menuId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .getOne();

    return updatedMenu!;
  }

  async bulkDeleteMenuItems(menuId: string, itemIds: string[]): Promise<Menu> {
    const menu = await this.menuRepository.findOne({
      where: { id: menuId, isActive: true },
      relations: ["items", "items.category", "categories"],
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    // Set isActive to false as a safety measure before soft deleting
    await this.menuItemRepository
      .createQueryBuilder()
      .update(MenuItem)
      .set({ isActive: false })
      .where("id IN (:...itemIds)", { itemIds })
      .andWhere("menuId = :menuId", { menuId })
      .execute();

    // Soft delete all menu items in bulk
    await this.menuItemRepository
      .createQueryBuilder()
      .softDelete()
      .where("id IN (:...itemIds)", { itemIds })
      .andWhere("menuId = :menuId", { menuId })
      .execute();

    logger.info(`Bulk soft deleted ${itemIds.length} menu items from menu: ${menuId}`);

    // Reload the menu with updated items (excluding soft-deleted items)
    const updatedMenu = await this.menuRepository
      .createQueryBuilder("menu")
      .leftJoinAndSelect("menu.items", "items", "items.deletedAt IS NULL")
      .leftJoinAndSelect("items.ingredients", "ingredients")
      .leftJoinAndSelect("items.category", "category", "category.isActive = :categoryActive", { categoryActive: true })
      .leftJoinAndSelect("menu.categories", "categories", "categories.isActive = :categoriesActive", { categoriesActive: true })
      .where("menu.id = :menuId", { menuId })
      .andWhere("menu.isActive = :isActive", { isActive: true })
      .getOne();

    return updatedMenu!;
  }
}
