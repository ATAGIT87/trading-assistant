import { SignalsService } from "../signals/signals.service";
import { MarketDataService } from "../market-data/market-data.service";
import { AlertsService } from "../alerts/alerts.service";
import { AssetsService } from "../assets/assets.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class ScannerService {
    private readonly signalsService;
    private readonly marketDataService;
    private readonly alertsService;
    private readonly assetsService;
    constructor(signalsService: SignalsService, marketDataService: MarketDataService, alertsService: AlertsService, assetsService: AssetsService);
    private isMarketDataFresh;
    scan(symbol: string, timeframe: Timeframe, period?: number): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: import("../signals/signal.types").SignalAction;
        signalTime: Date;
        entry: number | null;
        stopLoss: number | null;
        takeProfit: number | null;
        riskReward: number | null;
        reason: string;
        strategyVersion: string;
    } | null>;
    scheduledScan(): Promise<void>;
}
