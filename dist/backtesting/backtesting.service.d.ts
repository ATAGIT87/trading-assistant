import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { TradingSignal } from "../signals/signal.types";
export interface BacktestTrade {
    riskAmount: number;
    resultR: number | null;
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
    sellAdxBelow25Trades: number;
    sellAdxBelow25Wins: number;
    sellAdxBelow25R: number;
    sellAdx25To30Trades: number;
    sellAdx25To30Wins: number;
    sellAdx25To30R: number;
    sellAdx30To35Trades: number;
    sellAdx30To35Wins: number;
    sellAdx30To35R: number;
    sellAdx35To40Trades: number;
    sellAdx35To40Wins: number;
    sellAdx35To40R: number;
    sellAdxAbove40Trades: number;
    sellAdxAbove40Wins: number;
    sellAdxAbove40R: number;
    sellWinAverageRsi: number;
    sellLossAverageRsi: number;
    sellWinAverageAdx: number;
    sellLossAverageAdx: number;
    buyWinAverageRsi: number;
    buyLossAverageRsi: number;
    buyWinAverageAdx: number;
    buyLossAverageAdx: number;
    buyTrades: number;
    buyWins: number;
    buyLosses: number;
    buyTotalR: number;
    sellTrades: number;
    sellWins: number;
    sellLosses: number;
    sellTotalR: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalR: number;
    expectancyR: number;
    trades: BacktestTrade[];
    training: {
        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        totalR: number;
        expectancyR: number;
    };
    test: {
        totalTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        totalR: number;
        expectancyR: number;
    };
}
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly signalsService;
    constructor(marketDataService: MarketDataService, signalsService: SignalsService);
    private calculateBacktestSummary;
    run(symbol: string, timeframe: Timeframe): Promise<BacktestResult>;
    private findTradeOutcome;
}
