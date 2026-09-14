import { AssetType } from "../enums/asset-type.enum";
export declare class Asset {
    id: number;
    symbol: string;
    name: string;
    type: AssetType;
    isActive: boolean;
}
