import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { AlertsService } from "../alerts/alerts.service";
export declare class ScannerService {
    private readonly signalsService;
    private readonly alertsService;
    constructor(signalsService: SignalsService, alertsService: AlertsService);
    scan(symbol: string, timeframe: Timeframe, period?: number): Promise<import("../signals/signal.types").TradingSignal | null>;
}
