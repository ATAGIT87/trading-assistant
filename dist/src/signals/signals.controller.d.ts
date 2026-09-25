import { Timeframe } from "../assets/enums/timeframe.enum";
import { SignalsService } from "./signals.service";
export declare class SignalsController {
    private readonly signalsService;
    constructor(signalsService: SignalsService);
    getLiveV2Signal(symbol: string, timeframe: Timeframe): Promise<import("./signal.types").TradingSignal>;
}
