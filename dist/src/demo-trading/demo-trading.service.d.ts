import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { BacktestingService } from "../backtesting/backtesting.service";
import { DemoPosition } from "./entities/demo-position.entity";
export declare class DemoTradingService {
    private readonly demoPositionRepository;
    private readonly signalsService;
    private readonly marketDataService;
    private readonly backtestingService;
    constructor(demoPositionRepository: Repository<DemoPosition>, signalsService: SignalsService, marketDataService: MarketDataService, backtestingService: BacktestingService);
    resolvePositionOutcome(position: Pick<DemoPosition, "side" | "entry" | "stopLoss" | "takeProfit" | "riskReward">, candle: Pick<MarketCandle, "low" | "high">): {
        status: "OPEN" | "WIN" | "LOSS";
        exitPrice: number | null;
        resultR: number | null;
    };
    openPosition(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: "WAIT" | "NO_TRADE";
        reason: string;
        position: null;
        signal?: undefined;
    } | {
        symbol: string;
        timeframe: Timeframe;
        action: "BUY" | "SELL";
        signal: import("../signals/signal.types").TradingSignal;
        reason: string;
        position: DemoPosition;
    }>;
    getOpenPositions(): Promise<DemoPosition[]>;
    getHistory(): Promise<DemoPosition[]>;
    checkOpenPositions(): Promise<{
        checkedAt: Date;
        processed: {
            symbol: string;
            timeframe: Timeframe;
            side: "BUY" | "SELL";
            entry: number;
            stopLoss: number;
            takeProfit: number;
            status: "OPEN" | "WIN" | "LOSS";
            exitPrice: number | null;
            closedAt: Date | null;
            resultR: number | null;
            reason: string;
        }[];
    }>;
    private getLatestCompletedCandle;
    private getTimeframeDurationMs;
}
