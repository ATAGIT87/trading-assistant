import { Timeframe } from "../assets/enums/timeframe.enum";
import { SignalsService } from "./signals.service";
export declare class SignalsController {
    private readonly signalsService;
    constructor(signalsService: SignalsService);
    getLiveV2Signal(symbol: string, timeframe: Timeframe): Promise<{
        symbol: string;
        timeframe: Timeframe;
        action: import("./signal.types").SignalAction;
        signalTime: Date;
        entry: number | null;
        stopLoss: number | null;
        takeProfit: number | null;
        riskReward: number | null;
        reason: string;
        strategyVersion: string;
    }>;
}
