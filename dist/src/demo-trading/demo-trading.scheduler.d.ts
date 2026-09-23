import { SignalsService } from "../signals/signals.service";
import { DemoTradingService } from "./demo-trading.service";
import { TelegramNotificationService } from "./telegram-notification.service";
export declare class DemoTradingScheduler {
    private readonly demoTradingService;
    private readonly signalsService;
    private readonly telegramNotificationService;
    private readonly logger;
    private readonly demoMarkets;
    constructor(demoTradingService: DemoTradingService, signalsService: SignalsService, telegramNotificationService: TelegramNotificationService);
    handleDemoTradingCycle(): Promise<void>;
}
