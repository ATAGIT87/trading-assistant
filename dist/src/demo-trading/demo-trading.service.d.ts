import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketCandle } from "../market-data/entities/market-candle.entity";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { DemoPosition } from "./entities/demo-position.entity";
export declare class DemoTradingService {
    private readonly demoPositionRepository;
    private readonly signalsService;
    private readonly marketDataService;
    constructor(demoPositionRepository: Repository<DemoPosition>, signalsService: SignalsService, marketDataService: MarketDataService);
    resolvePositionOutcome(position: Pick<DemoPosition, "side" | "entry" | "stopLoss" | "takeProfit" | "riskReward">, candle: Pick<MarketCandle, "low" | "high">): {
        status: "OPEN" | "WIN" | "LOSS";
        exitPrice: number | null;
        resultR: number | null;
    };
    openPosition(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: string;
        reason: string;
        position: null;
        signal?: undefined;
    } | {
        symbol: string;
        timeframe: Timeframe;
        action: string;
        signal: {
            symbol: string;
            timeframe: Timeframe;
            action: string;
            signalTime: Date;
            entry: null;
            stopLoss: null;
            takeProfit: null;
            riskReward: null;
            reason: string;
            strategyVersion: string;
        } | {
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
        };
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
