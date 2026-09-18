import { TradingSignal } from "../signals/signal.types";
export declare class AlertsService {
    sendSignalAlert(symbol: string, timeframe: string, signal: TradingSignal): Promise<void>;
}
