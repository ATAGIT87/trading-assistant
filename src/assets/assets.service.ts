import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Asset } from "./entities/asset.entity";
import { AssetType } from "./enums/asset-type.enum";
import { UpdateAssetDto } from "./dto/update-asset.dto";
@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset)
    private readonly assetRepository: Repository<Asset>,
  ) {}

  findAll(): Promise<Asset[]> {
    return this.assetRepository.find();
  }
  findOne(id: number): Promise<Asset | null> {
    return this.assetRepository.findOne({
      where: { id },
    });
  }
  create(symbol: string, name: string, type: AssetType): Promise<Asset> {
    const asset = this.assetRepository.create({
      symbol,
      name,
      type,
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
    await this.assetRepository.delete(id);
  }
}
