import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/database";
import { Asset } from "../entities/assets/Asset";
import { Store } from "../entities/stores/Store";
import { logger } from "../utils/logger";

/**
 * Middleware to verify that the user has access to the store
 * Checks if the storeId in request params/body belongs to the authenticated user
 */
export async function verifyStoreAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get storeId from params or body
    const storeId = req.params.storeId || req.body.storeId;

    if (!storeId) {
      res.status(400).json({
        message: "Store ID is required",
      });
      return;
    }

    // In a real implementation, you would check if the authenticated user
    // owns this store. For now, we just verify the store exists.
    // TODO: Implement proper user authentication and authorization

    const storeRepository = AppDataSource.getRepository(Store);
    const store = await storeRepository.findOne({
      where: { id: storeId },
    });

    if (!store) {
      res.status(404).json({
        message: "Store not found",
      });
      return;
    }

    next();
  } catch (error) {
    logger.error("Store access verification error:", error);
    res.status(500).json({
      message: "Failed to verify store access",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}

/**
 * Middleware to verify that the user has access to the asset
 * Checks if the asset belongs to a store owned by the authenticated user
 */
export async function verifyAssetAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const assetId = req.params.id;

    if (!assetId) {
      res.status(400).json({
        message: "Asset ID is required",
      });
      return;
    }

    const assetRepository = AppDataSource.getRepository(Asset);
    const asset = await assetRepository.findOne({
      where: { id: assetId },
      relations: ["store"],
    });

    if (!asset) {
      res.status(404).json({
        message: "Asset not found",
      });
      return;
    }

    // In a real implementation, you would check if the authenticated user
    // owns the store that owns this asset
    // TODO: Implement proper user authentication and authorization

    next();
  } catch (error) {
    logger.error("Asset access verification error:", error);
    res.status(500).json({
      message: "Failed to verify asset access",
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
