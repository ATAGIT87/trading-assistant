import { Timeframe } from "../../assets/enums/timeframe.enum";
export declare class CreateMarketCandleDto {
    symbol: string;
    timeframe: Timeframe;
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
