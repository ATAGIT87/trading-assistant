import { Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Asset } from "./entities/asset.entity";
import { AssetType } from "./enums/asset-type.enum";
import { UpdateAssetDto } from "./dto/update-asset.dto";
import { Timeframe } from "./enums/timeframe.enum";
@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  findAll(): Promise<Asset[]> {
    return this.assetRepository.find();
  }
  async findOne(id: number): Promise<Asset | null> {
    const asset = await this.assetRepository.findOne({
      where: { id },
    });
    if (!asset) {
      throw new NotFoundException("Asset not found");
    }
    return asset;
  }
  create(
    symbol: string,
    name: string,
    type: AssetType,
    isActive?: boolean,
    timeframe?: Timeframe,
  ): Promise<Asset> {
    const asset = this.assetRepository.create({
      symbol,
      name,
      type,
      ...(isActive !== undefined && { isActive }),
      ...(timeframe !== undefined && { timeframe }),
    });

    return this.assetRepository.save(asset);
  }
  async update(id: number, data: UpdateAssetDto): Promise<Asset | null> {
    const asset = await this.assetRepository.preload({
      id,
      ...data,
    });
    if (!asset) {
      return null;
    }
    return this.assetRepository.save(asset);
  }

  async remove(id: number): Promise<void> {
    const result = await this.assetRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException("Asset not found");
    }
  }

  findActive(): Promise<Asset[]> {
    return this.assetRepository.find({
      where: {
        isActive: true,
      },
    });
  }
  async findActiveAssets(): Promise<Asset[]> {
  return this.assetRepository.find({
    where: {
      isActive: true,
    },
  });
}
}
