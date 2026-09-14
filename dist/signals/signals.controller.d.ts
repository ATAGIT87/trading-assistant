import { SignalsService } from "./signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
export declare class SignalsController {
    private readonly signalsService;
    constructor(signalsService: SignalsService);
    generateSignal(symbol: string, timeframe: Timeframe, period: string): Promise<import("./signal.types").TradingSignal | null>;
}
