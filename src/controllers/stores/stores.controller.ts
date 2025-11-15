import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import {
  StoresService,
  CreateStoreRequest,
  UpdateStoreRequest,
} from "../../services/stores/stores.service";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";

export class StoresController {
  private storesService: StoresService;

  constructor(dataSource: DataSource = AppDataSource) {
    this.storesService = new StoresService(dataSource);
  }

  async getStores(req: Request, res: Response): Promise<void> {
    try {
      const stores = await this.storesService.getStores();

      res.json({
        message: "Stores retrieved successfully",
        data: stores,
        count: stores.length,
      });
    } catch (error) {
      logger.error("Get stores error:", error);
      res.status(500).json({
        message: "Failed to retrieve stores",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getStoreById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const store = await this.storesService.getStoreById(id);

      if (!store) {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.json({
        message: "Store retrieved successfully",
        data: store,
      });
    } catch (error) {
      logger.error("Get store by ID error:", error);
      res.status(500).json({
        message: "Failed to retrieve store",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async getStoreBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;

      const store = await this.storesService.getStoreBySlug(slug);

      if (!store) {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.json({
        message: "Store retrieved successfully",
        data: store,
      });
    } catch (error) {
      logger.error("Get store by slug error:", error);
      res.status(500).json({
        message: "Failed to retrieve store",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async createStore(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      const request: CreateStoreRequest = req.body;

      const result = await this.storesService.createStore(request);

      res.status(201).json({
        message: "Store created successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Create store error:", error);
      res.status(500).json({
        message: "Failed to create store",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateStore(req: Request, res: Response): Promise<void> {
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
      const request: UpdateStoreRequest = req.body;

      const store = await this.storesService.updateStore(id, request);

      res.json({
        message: "Store updated successfully",
        data: store,
      });
    } catch (error) {
      logger.error("Update store error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update store",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async toggleTemporaryClosure(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { closureMessage } = req.body;

      const store = await this.storesService.toggleTemporaryClosure(
        id,
        closureMessage
      );

      res.json({
        message: `Temporary closure ${
          store.isTemporarilyClosed ? "enabled" : "disabled"
        } successfully`,
        data: {
          isTemporarilyClosed: store.isTemporarilyClosed,
          closureMessage: store.closureMessage,
        },
      });
    } catch (error) {
      logger.error("Toggle temporary closure error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to toggle temporary closure",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async deleteStore(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.storesService.deleteStore(id);

      res.json({
        message: "Store deleted successfully",
      });
    } catch (error) {
      logger.error("Delete store error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to delete store",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
