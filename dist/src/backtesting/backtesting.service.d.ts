import { ConfigService } from "@nestjs/config";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { MarketDataService } from "../market-data/market-data.service";
import { StrategyV2Service } from "../signals/strategy-v2.service";
import { BacktestResult } from "./interfaces/backtest-result.interface";
export declare class BacktestingService {
    private readonly marketDataService;
    private readonly strategyV2Service;
    private readonly configService;
    private readonly feeRate;
    private readonly slippageRate;
    constructor(marketDataService: MarketDataService, strategyV2Service: StrategyV2Service, configService: ConfigService);
    private getNumericConfigValue;
    run(symbol: string, timeframe: Timeframe, _useHigherTimeframeConfirmation?: boolean, _excludeHighAdxSell?: boolean): Promise<BacktestResult>;
}
