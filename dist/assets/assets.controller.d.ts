import { AssetsService } from "./assets.service";
import { CreateAssetDto } from "./dto/create-asset.dto";
import { UpdateAssetDto } from "./dto/update-asset.dto";
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    findAll(): Promise<import("./entities/asset.entity").Asset[]>;
    findOne(id: string): Promise<import("./entities/asset.entity").Asset | null>;
    create(dto: CreateAssetDto): Promise<import("./entities/asset.entity").Asset>;
    update(id: string, dto: UpdateAssetDto): Promise<import("./entities/asset.entity").Asset | null>;
    remove(id: string): Promise<void>;
}
