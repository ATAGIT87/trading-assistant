import { Timeframe } from "../../assets/enums/timeframe.enum";
import { SignalAction } from "../../signals/signal.types";
export declare class AlertDelivery {
    id: number;
    symbol: string;
    timeframe: Timeframe;
    candleTime: Date;
    action: Extract<SignalAction, "BUY" | "SELL">;
    sentAt: Date;
}
