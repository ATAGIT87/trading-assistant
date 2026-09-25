import { SignalsService } from "../signals/signals.service";
import { MarketDataService } from "../market-data/market-data.service";
import { AlertsService } from "../alerts/alerts.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { AssetsService } from "../assets/assets.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class ScannerService {
    private readonly signalsService;
    private readonly marketDataService;
    private readonly alertsService;
    private readonly assetsService;
    private readonly backtestingService;
    constructor(signalsService: SignalsService, marketDataService: MarketDataService, alertsService: AlertsService, assetsService: AssetsService, backtestingService: BacktestingService);
    private isMarketDataFresh;
    scan(symbol: string, timeframe: Timeframe): Promise<import("../signals/signal.types").TradingSignal | null>;
    scheduledScan(): Promise<void>;
}
