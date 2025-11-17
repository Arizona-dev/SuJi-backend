import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import {
  MenusService,
  CreateMenuRequest,
  UpdateMenuRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  UpdateIngredientRequest,
} from "../../services/menus/menus.service";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";

export class MenusController {
  private menusService: MenusService;

  constructor(dataSource: DataSource = AppDataSource) {
    this.menusService = new MenusService(dataSource);
  }

  async getMenuForStore(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;

      const menu = await this.menusService.getMenuForStore(storeId);

      res.json({
        message: "Menu retrieved successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Get menu for store error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to retrieve menu",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async createMenu(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const request: CreateMenuRequest = req.body;

      const menu = await this.menusService.createMenu(request);

      res.status(201).json({
        message: "Menu created successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Create menu error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to create menu",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateMenu(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const request: UpdateMenuRequest = req.body;

      const menu = await this.menusService.updateMenu(id, request);

      res.json({
        message: "Menu updated successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Update menu error:", error);

      if (error instanceof Error && error.message === "Menu not found") {
        res.status(404).json({
          message: "Menu not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update menu",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async deleteMenu(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.menusService.deleteMenu(id);

      res.json({
        message: "Menu deleted successfully",
      });
    } catch (error) {
      logger.error("Delete menu error:", error);

      if (error instanceof Error && error.message === "Menu not found") {
        res.status(404).json({
          message: "Menu not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to delete menu",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async createMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      // Support both /menus/:menuId/items and /menus/items
      const { menuId } = req.params;
      const request: CreateMenuItemRequest = {
        ...req.body,
        menuId: menuId || req.body.menuId,
      };

      const menu = await this.menusService.createMenuItem(request);

      res.status(201).json({
        message: "Menu item created successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Create menu item error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";

      if (errorMessage.includes("not found")) {
        res.status(404).json({
          message: errorMessage,
        });
        return;
      }

      res.status(500).json({
        message: "Failed to create menu item",
        error: errorMessage,
      });
    }
  }

  async updateMenuItem(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      // Support both /menus/:menuId/items/:id and /menus/items/:id
      const { id, itemId } = req.params;
      const menuItemId = itemId || id;
      const request: UpdateMenuItemRequest = req.body;

      const menu = await this.menusService.updateMenuItem(menuItemId, request);

      res.json({
        message: "Menu item updated successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Update menu item error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";

      if (errorMessage.includes("not found")) {
        res.status(404).json({
          message: errorMessage,
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update menu item",
        error: errorMessage,
      });
    }
  }

  async deleteMenuItem(req: Request, res: Response): Promise<void> {
    try {
      // Support both /menus/:menuId/items/:id and /menus/items/:id
      const { id, itemId } = req.params;
      const menuItemId = itemId || id;

      const menu = await this.menusService.deleteMenuItem(menuItemId);

      res.json({
        message: "Menu item deleted successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Delete menu item error:", error);

      if (error instanceof Error && error.message === "Menu item not found") {
        res.status(404).json({
          message: "Menu item not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to delete menu item",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  // Category methods

  async getCategoriesForMenu(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;

      const categories = await this.menusService.getCategoriesForMenu(menuId);

      res.json({
        message: "Categories retrieved successfully",
        data: categories,
      });
    } catch (error) {
      logger.error("Get categories for menu error:", error);
      res.status(500).json({
        message: "Failed to retrieve categories",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { menuId } = req.params;
      const request: CreateCategoryRequest = {
        ...req.body,
        menuId: menuId || req.body.menuId,
      };

      const category = await this.menusService.createCategory(request);

      res.status(201).json({
        message: "Category created successfully",
        data: category,
      });
    } catch (error) {
      logger.error("Create category error:", error);

      if (error instanceof Error && error.message === "Menu not found") {
        res.status(404).json({
          message: "Menu not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to create category",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const request: UpdateCategoryRequest = req.body;

      const category = await this.menusService.updateCategory(id, request);

      res.json({
        message: "Category updated successfully",
        data: category,
      });
    } catch (error) {
      logger.error("Update category error:", error);

      if (error instanceof Error && error.message === "Category not found") {
        res.status(404).json({
          message: "Category not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update category",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.menusService.deleteCategory(id);

      res.json({
        message: "Category deleted successfully",
      });
    } catch (error) {
      logger.error("Delete category error:", error);

      if (error instanceof Error && error.message === "Category not found") {
        res.status(404).json({
          message: "Category not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to delete category",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateCategoryPositions(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const { positions } = req.body;

      await this.menusService.updateCategoryPositions(menuId, positions);

      res.json({
        message: "Category positions updated successfully",
      });
    } catch (error) {
      logger.error("Update category positions error:", error);
      res.status(500).json({
        message: "Failed to update category positions",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateMenuItemPositions(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const { positions } = req.body;

      const menu = await this.menusService.updateMenuItemPositions(menuId, positions);

      res.json({
        message: "Menu item positions updated successfully",
        data: menu,
      });
    } catch (error) {
      logger.error("Update menu item positions error:", error);
      res.status(500).json({
        message: "Failed to update menu item positions",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getIngredientsForStore(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;

      const ingredients = await this.menusService.getIngredientsForStore(
        storeId
      );

      res.json({
        message: "Ingredients retrieved successfully",
        data: ingredients,
        count: ingredients.length,
      });
    } catch (error) {
      logger.error("Get ingredients for store error:", error);
      res.status(500).json({
        message: "Failed to retrieve ingredients",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async createIngredient(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { name, description, storeId } = req.body;

      const ingredient = await this.menusService.createIngredient(
        name,
        description,
        storeId
      );

      res.status(201).json({
        message: "Ingredient created successfully",
        data: ingredient,
      });
    } catch (error) {
      logger.error("Create ingredient error:", error);
      res.status(500).json({
        message: "Failed to create ingredient",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateIngredient(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { id } = req.params;
      const request: UpdateIngredientRequest = {
        ...req.body,
        disabledUntil: req.body.disabledUntil
          ? new Date(req.body.disabledUntil)
          : undefined,
      };

      const ingredient = await this.menusService.updateIngredient(id, request);

      res.json({
        message: "Ingredient updated successfully",
        data: ingredient,
      });
    } catch (error) {
      logger.error("Update ingredient error:", error);

      if (error instanceof Error && error.message === "Ingredient not found") {
        res.status(404).json({
          message: "Ingredient not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update ingredient",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async disableIngredient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { until } = req.body;

      const untilDate = until ? new Date(until) : undefined;

      const ingredient = await this.menusService.disableIngredient(
        id,
        untilDate
      );

      res.json({
        message: "Ingredient disabled successfully",
        data: ingredient,
      });
    } catch (error) {
      logger.error("Disable ingredient error:", error);

      if (error instanceof Error && error.message === "Ingredient not found") {
        res.status(404).json({
          message: "Ingredient not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to disable ingredient",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async enableIngredient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const ingredient = await this.menusService.enableIngredient(id);

      res.json({
        message: "Ingredient enabled successfully",
        data: ingredient,
      });
    } catch (error) {
      logger.error("Enable ingredient error:", error);

      if (error instanceof Error && error.message === "Ingredient not found") {
        res.status(404).json({
          message: "Ingredient not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to enable ingredient",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async deleteIngredient(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.menusService.deleteIngredient(id);

      res.json({
        message: "Ingredient deleted successfully",
      });
    } catch (error) {
      logger.error("Delete ingredient error:", error);

      if (error instanceof Error && error.message === "Ingredient not found") {
        res.status(404).json({
          message: "Ingredient not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to delete ingredient",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async bulkUpdateIngredients(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const { ingredientIds, updates } = req.body;

      // Convert disabledUntil to Date if present
      const processedUpdates = {
        ...updates,
        disabledUntil: updates.disabledUntil
          ? new Date(updates.disabledUntil)
          : undefined,
      };

      const ingredients = await this.menusService.bulkUpdateIngredients(
        ingredientIds,
        processedUpdates
      );

      res.json({
        message: `${ingredientIds.length} ingredient(s) updated successfully`,
        data: ingredients,
      });
    } catch (error) {
      logger.error("Bulk update ingredients error:", error);

      res.status(500).json({
        message: "Failed to bulk update ingredients",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async bulkUpdateMenuItems(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const { itemIds, updates } = req.body;

      const menu = await this.menusService.bulkUpdateMenuItems(menuId, itemIds, updates);

      res.json({
        message: `${itemIds.length} menu item(s) updated successfully`,
        data: menu,
      });
    } catch (error) {
      logger.error("Bulk update menu items error:", error);

      if (error instanceof Error && error.message === "Menu not found") {
        res.status(404).json({
          message: "Menu not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to bulk update menu items",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async bulkDeleteMenuItems(req: Request, res: Response): Promise<void> {
    try {
      const { menuId } = req.params;
      const { itemIds } = req.body;

      const menu = await this.menusService.bulkDeleteMenuItems(menuId, itemIds);

      res.json({
        message: `${itemIds.length} menu item(s) deleted successfully`,
        data: menu,
      });
    } catch (error) {
      logger.error("Bulk delete menu items error:", error);

      if (error instanceof Error && error.message === "Menu not found") {
        res.status(404).json({
          message: "Menu not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to bulk delete menu items",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
