import { ConfigService } from "@nestjs/config";
import { TradingSignal } from "../signals/signal.types";
export declare class TelegramNotificationService {
    private readonly configService;
    private readonly logger;
    private telegramDisabledLogged;
    constructor(configService: ConfigService);
    private get botToken();
    private get chatId();
    isEnabled(): boolean;
    private warnIfDisabled;
    sendOpenNotification(position: {
        symbol: string;
        timeframe: string;
        side: string;
        entry: number;
        stopLoss: number;
        takeProfit: number;
        riskReward: number | null;
    } | null, action: string, signal: TradingSignal | null): Promise<boolean>;
    sendCloseNotification(position: {
        symbol: string;
        timeframe: string;
        side: string;
        entry: number;
        stopLoss: number;
        takeProfit: number;
        status: "WIN" | "LOSS";
        exitPrice: number | null;
        resultR: number | null;
    }): Promise<boolean>;
    private sendMessage;
}
