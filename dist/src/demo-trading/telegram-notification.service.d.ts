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
        mode?: "APPROVED" | "EXPERIMENTAL";
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
        realizedPnlQuote?: number | null;
        exitReason?: "STOP_LOSS" | "TAKE_PROFIT" | "TIME_EXIT" | null;
        mode?: "APPROVED" | "EXPERIMENTAL";
    }): Promise<boolean>;
    private formatResultR;
    private sendMessage;
}
