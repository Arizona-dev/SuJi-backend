import { DataSource, Repository } from "typeorm";
import { Menu } from "../../entities/menus/Menu";
import { MenuItem } from "../../entities/menus/MenuItem";
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

export interface CreateMenuItemRequest {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  menuId: string;
  ingredientIds?: string[];
}

export interface UpdateMenuItemRequest {
  name?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  ingredientIds?: string[];
}

export class MenusService {
  private menuRepository: Repository<Menu>;
  private menuItemRepository: Repository<MenuItem>;
  private ingredientRepository: Repository<Ingredient>;
  private storeRepository: Repository<Store>;

  constructor(private dataSource: DataSource) {
    this.menuRepository = this.dataSource.getRepository(Menu);
    this.menuItemRepository = this.dataSource.getRepository(MenuItem);
    this.ingredientRepository = this.dataSource.getRepository(Ingredient);
    this.storeRepository = this.dataSource.getRepository(Store);
  }

  async getMenuForStore(storeId: string): Promise<Menu[]> {
    return await this.menuRepository.find({
      where: { storeId, isActive: true },
      relations: ["items", "items.ingredients"],
      order: {
        createdAt: "ASC",
      },
    });
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

  async createMenuItem(request: CreateMenuItemRequest): Promise<MenuItem> {
    // Verify menu exists
    const menu = await this.menuRepository.findOne({
      where: { id: request.menuId, isActive: true },
    });

    if (!menu) {
      throw new Error("Menu not found");
    }

    // Load ingredients if provided
    let ingredients: Ingredient[] = [];
    if (request.ingredientIds && request.ingredientIds.length > 0) {
      ingredients = await this.ingredientRepository.findByIds(
        request.ingredientIds
      );
      if (ingredients.length !== request.ingredientIds.length) {
        throw new Error("One or more ingredients not found");
      }
    }

    const menuItem = this.menuItemRepository.create({
      name: request.name,
      description: request.description,
      price: request.price,
      imageUrl: request.imageUrl,
      menuId: request.menuId,
      isActive: true,
      ingredients,
    });

    const savedMenuItem = await this.menuItemRepository.save(menuItem);

    logger.info(
      `Menu item created: ${savedMenuItem.id} for menu: ${request.menuId}`
    );

    return savedMenuItem;
  }

  async updateMenuItem(
    id: string,
    request: UpdateMenuItemRequest
  ): Promise<MenuItem> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id, isActive: true },
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

    // Update ingredients if provided
    if (request.ingredientIds !== undefined) {
      if (request.ingredientIds.length > 0) {
        const ingredients = await this.ingredientRepository.findByIds(
          request.ingredientIds
        );
        if (ingredients.length !== request.ingredientIds.length) {
          throw new Error("One or more ingredients not found");
        }
        menuItem.ingredients = ingredients;
      } else {
        menuItem.ingredients = [];
      }
    }

    const updatedMenuItem = await this.menuItemRepository.save(menuItem);

    logger.info(`Menu item updated: ${id}`);

    return updatedMenuItem;
  }

  async deleteMenuItem(id: string): Promise<void> {
    const menuItem = await this.menuItemRepository.findOne({
      where: { id, isActive: true },
    });

    if (!menuItem) {
      throw new Error("Menu item not found");
    }

    menuItem.isActive = false;
    await this.menuItemRepository.save(menuItem);

    logger.info(`Menu item deactivated: ${id}`);
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
}
