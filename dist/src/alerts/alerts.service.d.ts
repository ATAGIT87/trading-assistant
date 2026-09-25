import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { TradingSignal } from "../signals/signal.types";
import { AlertDelivery } from "./entities/alert-delivery.entity";
export declare class AlertsService {
    private readonly alertDeliveryRepository;
    constructor(alertDeliveryRepository: Repository<AlertDelivery>);
    sendSignalAlert(symbol: string, timeframe: Timeframe, signal: TradingSignal): Promise<void>;
}
