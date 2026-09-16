import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { TradingSignal } from "../signals/signal.types";
export interface BacktestTrade {
    time: Date;
    action: "BUY" | "SELL";
    confidence: number;
    entryPrice: number;
    stopLoss: number | null;
    takeProfit: number | null;
    trend: TradingSignal["trend"];
    rsi: number;
    adx: number;
    marketCondition: TradingSignal["marketCondition"];
    result: "WIN" | "LOSS" | "OPEN";
    exitTime: Date | null;
}
export interface BacktestResult {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    trades: BacktestTrade[];
}
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly signalsService;
    constructor(marketDataService: MarketDataService, signalsService: SignalsService);
    run(symbol: string, timeframe: Timeframe): Promise<BacktestResult>;
    private findTradeOutcome;
}
