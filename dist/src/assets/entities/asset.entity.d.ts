import { AssetType } from "../enums/asset-type.enum";
import { Timeframe } from "../enums/timeframe.enum";
export declare class Asset {
    id: number;
    symbol: string;
    name: string;
    type: AssetType;
    isActive: boolean;
    timeframe: Timeframe;
}
