import { AssetType } from "../enums/asset-type.enum";
import { Timeframe } from "../enums/timeframe.enum";
export declare class CreateAssetDto {
    symbol: string;
    name: string;
    type: AssetType;
    isActive?: boolean;
    timeframe?: Timeframe;
}
