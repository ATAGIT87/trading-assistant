import { AssetType } from "../enums/asset-type.enum";
export declare class CreateAssetDto {
    symbol: string;
    name: string;
    type: AssetType;
    isActive?: boolean;
}
