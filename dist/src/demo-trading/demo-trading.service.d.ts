import { ConfigService } from "@nestjs/config";
import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { StrategyRegistryService } from "../signals/strategy-registry.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { DemoPosition } from "./entities/demo-position.entity";
export declare class DemoTradingService {
    private readonly demoPositionRepository;
    private readonly signalsService;
    private readonly marketDataService;
    private readonly backtestingService;
    private readonly strategyRegistry;
    private readonly configService;
    constructor(demoPositionRepository: Repository<DemoPosition>, signalsService: SignalsService, marketDataService: MarketDataService, backtestingService: BacktestingService, strategyRegistry: StrategyRegistryService, configService: ConfigService);
    resolvePositionOutcome(position: Pick<DemoPosition, "side" | "entry" | "stopLoss" | "takeProfit" | "riskReward">, candle: Pick<MarketCandle, "low" | "high">): {
        status: "OPEN" | "WIN" | "LOSS";
        exitPrice: number | null;
        resultR: number | null;
        exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
    };
    openPosition(symbol: string, timeframe: Timeframe, experimental?: boolean): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: "SELL" | "WAIT" | "NO_TRADE";
        reason: string;
        position: null;
        signal?: undefined;
    } | {
        symbol: string;
        timeframe: Timeframe;
        action: "BUY";
        signal: import("../signals/signal.types").TradingSignal;
        reason: string;
        position: DemoPosition;
    }>;
    getOpenPositions(): Promise<DemoPosition[]>;
    getHistory(): Promise<DemoPosition[]>;
    getSummary(): Promise<{
        openPositions: number;
        completedTrades: number;
        winningTrades: number;
        losingTrades: number;
        winRate: number;
        totalR: number;
        expectancyR: number;
    }>;
    private isDuplicateSignalError;
    checkOpenPositions(): Promise<{
        checkedAt: Date;
        processed: {
            symbol: string;
            timeframe: Timeframe;
            side: "BUY";
            mode: DemoPosition["mode"];
            entry: number;
            stopLoss: number;
            takeProfit: number;
            status: "OPEN" | "WIN" | "LOSS";
            exitPrice: number | null;
            closedAt: Date | null;
            resultR: number | null;
            exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
            reason: string;
        }[];
    }>;
    private getCompletedCandlesAfterOpen;
    private getTimeframeDurationMs;
    private getMaxOpenPositions;
    private getMaxHoldingCandles;
}
