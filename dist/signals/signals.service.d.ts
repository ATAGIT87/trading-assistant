import { TradingSignal } from './signal.types';
export declare class SignalsService {
    determineAction(marketCondition: TradingSignal['marketCondition']): TradingSignal['action'];
}
