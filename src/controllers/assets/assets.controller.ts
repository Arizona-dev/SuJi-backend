import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { DataSource } from "typeorm";
import { AssetsService, CreateAssetRequest, UpdateAssetRequest } from "../../services/assets/assets.service";
import { S3Service } from "../../services/s3/s3.service";
import { logger } from "../../utils/logger";
import { AppDataSource } from "../../config/database";

export class AssetsController {
  private assetsService: AssetsService;
  private s3Service: S3Service;

  constructor(dataSource: DataSource = AppDataSource) {
    this.assetsService = new AssetsService(dataSource);
    this.s3Service = new S3Service();
  }

  async getAssets(req: Request, res: Response): Promise<void> {
    try {
      const { storeId } = req.params;

      const assets = await this.assetsService.getAssetsForStore(storeId);

      res.json({
        message: "Assets retrieved successfully",
        data: assets,
        count: assets.length,
      });
    } catch (error) {
      logger.error("Get assets error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to retrieve assets",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async uploadAsset(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          message: "Validation failed",
          errors: errors.array(),
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          message: "No file uploaded",
        });
        return;
      }

      const { storeId } = req.body;
      const tags = req.body.tags ? JSON.parse(req.body.tags) : undefined;

      // Upload to S3
      const uploadResult = await this.s3Service.uploadFile(req.file, storeId);

      const request: CreateAssetRequest = {
        storeId,
        filename: req.file.originalname,
        url: uploadResult.url,
        mimeType: uploadResult.mimeType,
        size: uploadResult.size,
        tags,
      };

      const asset = await this.assetsService.createAsset(request);

      res.status(201).json({
        message: "Asset uploaded successfully",
        data: asset,
      });
    } catch (error) {
      logger.error("Upload asset error:", error);

      if (error instanceof Error && error.message === "Store not found") {
        res.status(404).json({
          message: "Store not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to upload asset",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async updateAsset(req: Request, res: Response): Promise<void> {
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
      const request: UpdateAssetRequest = req.body;

      const asset = await this.assetsService.updateAsset(id, request);

      res.json({
        message: "Asset updated successfully",
        data: asset,
      });
    } catch (error) {
      logger.error("Update asset error:", error);

      if (error instanceof Error && error.message === "Asset not found") {
        res.status(404).json({
          message: "Asset not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to update asset",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  async deleteAsset(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Get asset info before deletion to delete from S3
      const asset = await this.assetsService.getAssetById(id);

      if (!asset) {
        res.status(404).json({
          message: "Asset not found",
        });
        return;
      }

      // Delete from database first
      await this.assetsService.deleteAsset(id);

      // Extract S3 key from URL and delete from S3
      const key = this.s3Service.extractKeyFromUrl(asset.url);
      if (key) {
        await this.s3Service.deleteFile(key);
      }

      res.json({
        message: "Asset deleted successfully",
      });
    } catch (error) {
      logger.error("Delete asset error:", error);

      if (error instanceof Error && error.message === "Asset not found") {
        res.status(404).json({
          message: "Asset not found",
        });
        return;
      }

      res.status(500).json({
        message: "Failed to delete asset",
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
