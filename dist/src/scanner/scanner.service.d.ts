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
    scan(symbol: string, timeframe: Timeframe): Promise<import("../signals/signal.types").TradingSignal | null>;
    scheduledScan(): Promise<void>;
}
