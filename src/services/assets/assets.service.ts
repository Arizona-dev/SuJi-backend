import { DataSource, Repository } from "typeorm";
import { Asset } from "../../entities/assets/Asset";
import { Store } from "../../entities/stores/Store";
import { AppDataSource } from "../../config/database";
import { S3Service } from "../s3/s3.service";

export interface CreateAssetRequest {
  storeId: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  tags?: string[];
}

export interface UpdateAssetRequest {
  tags?: string[];
  usageCount?: number;
}

export class AssetsService {
  private assetRepository: Repository<Asset>;
  private storeRepository: Repository<Store>;
  private s3Service: S3Service;

  constructor(dataSource: DataSource = AppDataSource) {
    this.assetRepository = dataSource.getRepository(Asset);
    this.storeRepository = dataSource.getRepository(Store);
    this.s3Service = new S3Service();
  }

  async getAssetsForStore(storeId: string): Promise<Asset[]> {
    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    // If storage hasn't been calculated yet (e.g., for existing stores), calculate it now
    if (store.storageUsed === 0 || store.storageUsed === null) {
      try {
        const actualFolderSize = await this.s3Service.calculateFolderSize(storeId);
        store.storageUsed = actualFolderSize;
        await this.storeRepository.save(store);
      } catch (error) {
        // Don't fail if S3 calculation fails, just log it
        console.error("Failed to calculate initial storage:", error);
      }
    }

    const assets = await this.assetRepository.find({
      where: { storeId },
      order: { createdAt: "DESC" },
    });

    return assets;
  }

  async createAsset(request: CreateAssetRequest): Promise<Asset> {
    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: request.storeId },
    });

    if (!store) {
      throw new Error("Store not found");
    }

    const asset = this.assetRepository.create(request);
    await this.assetRepository.save(asset);

    // Update store storage usage with real S3 folder size
    const actualFolderSize = await this.s3Service.calculateFolderSize(request.storeId);
    store.storageUsed = actualFolderSize;
    await this.storeRepository.save(store);

    return asset;
  }

  async updateAsset(id: string, request: UpdateAssetRequest): Promise<Asset> {
    const asset = await this.assetRepository.findOne({
      where: { id },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    if (request.tags !== undefined) {
      asset.tags = request.tags;
    }

    if (request.usageCount !== undefined) {
      asset.usageCount = request.usageCount;
    }

    await this.assetRepository.save(asset);

    return asset;
  }

  async deleteAsset(id: string): Promise<void> {
    const asset = await this.assetRepository.findOne({
      where: { id },
    });

    if (!asset) {
      throw new Error("Asset not found");
    }

    // Extract S3 key before deleting from database
    const key = this.s3Service.extractKeyFromUrl(asset.url);

    // Delete from database first
    await this.assetRepository.remove(asset);

    // Delete from S3
    if (key) {
      try {
        await this.s3Service.deleteFile(key);
      } catch (error) {
        console.error("Failed to delete file from S3:", error);
        // Don't fail the entire operation if S3 deletion fails
        // The database record is already deleted
      }
    } else {
      console.error("Failed to extract S3 key from URL:", asset.url);
    }

    // Update store storage usage with real S3 folder size
    const store = await this.storeRepository.findOne({
      where: { id: asset.storeId },
    });

    if (store) {
      const actualFolderSize = await this.s3Service.calculateFolderSize(asset.storeId);
      store.storageUsed = actualFolderSize;
      await this.storeRepository.save(store);
    }
  }

  async getAssetById(id: string): Promise<Asset | null> {
    const asset = await this.assetRepository.findOne({
      where: { id },
    });

    return asset;
  }

  async verifyAssetOwnership(assetId: string, storeId: string): Promise<boolean> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId, storeId },
    });

    return asset !== null;
  }
}
