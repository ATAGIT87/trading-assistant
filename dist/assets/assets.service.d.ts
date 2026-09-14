import { Repository } from "typeorm";
import { Asset } from "./entities/asset.entity";
import { AssetType } from "./enums/asset-type.enum";
import { UpdateAssetDto } from "./dto/update-asset.dto";
export declare class AssetsService {
    private readonly assetRepository;
    constructor(assetRepository: Repository<Asset>);
    findAll(): Promise<Asset[]>;
    findOne(id: number): Promise<Asset | null>;
    create(symbol: string, name: string, type: AssetType, isActive?: boolean): Promise<Asset>;
    update(id: number, data: UpdateAssetDto): Promise<Asset | null>;
    remove(id: number): Promise<void>;
}
