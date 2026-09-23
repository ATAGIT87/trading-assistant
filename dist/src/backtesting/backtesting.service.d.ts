import { ConfigService } from "@nestjs/config";
import { MarketDataService } from "../market-data/market-data.service";
import { SignalsService } from "../signals/signals.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { BacktestResult } from "./interfaces/backtest-result.interface";
import { StrategyV2Service } from "../signals/strategy-v2.service";
import { IndicatorsService } from "../indicators/indicators.service";
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly signalsService;
    private readonly strategyV2Service;
    private readonly indicatorsService;
    private readonly configService;
    private readonly feeRate;
    private readonly slippageRate;
    constructor(marketDataService: MarketDataService, signalsService: SignalsService, strategyV2Service: StrategyV2Service, indicatorsService: IndicatorsService, configService: ConfigService);
    private getNumericConfigValue;
    private getHigherTimeframeTrendFromCandles;
    private isCompletedHigherTimeframeCandle;
    run(symbol: string, timeframe: Timeframe, useHigherTimeframeConfirmation?: boolean, excludeHighAdxSell?: boolean): Promise<BacktestResult>;
}
