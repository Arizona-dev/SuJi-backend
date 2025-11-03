import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import {
  MenusService,
  CreateMenuRequest,
  UpdateMenuRequest,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
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

      const menus = await this.menusService.getMenuForStore(storeId);

      res.json({
        message: "Menu retrieved successfully",
        data: menus,
      });
    } catch (error) {
      logger.error("Get menu for store error:", error);
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

      const request: CreateMenuItemRequest = req.body;

      const menuItem = await this.menusService.createMenuItem(request);

      res.status(201).json({
        message: "Menu item created successfully",
        data: menuItem,
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

      const { id } = req.params;
      const request: UpdateMenuItemRequest = req.body;

      const menuItem = await this.menusService.updateMenuItem(id, request);

      res.json({
        message: "Menu item updated successfully",
        data: menuItem,
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
      const { id } = req.params;

      await this.menusService.deleteMenuItem(id);

      res.json({
        message: "Menu item deleted successfully",
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
}
