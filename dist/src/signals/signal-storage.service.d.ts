import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { Signal } from "./entities/signal.entity";
import { TradingSignal } from "./signal.types";
export declare class SignalStorageService {
    private readonly signalRepository;
    constructor(signalRepository: Repository<Signal>);
    saveSignal(symbol: string, timeframe: Timeframe, signal: TradingSignal): Promise<Signal>;
    getSignalHistory(symbol: string, timeframe: Timeframe): Promise<Signal[]>;
    getLatestSignal(symbol: string, timeframe: Timeframe): Promise<Signal | null>;
    getSignalByCandleTime(symbol: string, timeframe: Timeframe, candleTime: Date): Promise<Signal | null>;
}
