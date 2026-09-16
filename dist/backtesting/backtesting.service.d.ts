import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { TradingSignal } from "../signals/signal.types";
export interface BacktestResult {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
}
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly signalsService;
    constructor(marketDataService: MarketDataService, signalsService: SignalsService);
    isTradeWinner(signal: TradingSignal, futureCandles: MarketCandle[]): boolean | null;
    run(symbol: string, timeframe: Timeframe): Promise<BacktestResult>;
    private findTradeOutcome;
}
