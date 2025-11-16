import { DataSource, Repository } from "typeorm";
import { Asset } from "../../entities/assets/Asset";
import { Store } from "../../entities/stores/Store";
import { AppDataSource } from "../../config/database";

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

  constructor(dataSource: DataSource = AppDataSource) {
    this.assetRepository = dataSource.getRepository(Asset);
    this.storeRepository = dataSource.getRepository(Store);
  }

  async getAssetsForStore(storeId: string): Promise<Asset[]> {
    // Verify store exists
    const store = await this.storeRepository.findOne({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Store not found");
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

    await this.assetRepository.remove(asset);
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
