import { Timeframe } from '../../assets/enums/timeframe.enum';
export declare class MarketCandle {
    id: number;
    symbol: string;
    timeframe: Timeframe;
    time: Date;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
}
