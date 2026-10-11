import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { MarketDataService } from "../../../src/production/market-data/market-data.service";
import { supportedTradingSymbols } from "../../../src/production/market-data/trading-symbol";
import { EmaRsiReplayStrategy } from "../strategies/ema-rsi-replay.strategy";
import { simulateSpotBasket } from "./spot-basket-simulation";

/** Read-only research adapter. Approval evidence is never manufactured from OHLC proxies. */
@Injectable()
export class BacktestingService {
  constructor(
    private readonly marketData: MarketDataService,
    private readonly strategy: EmaRsiReplayStrategy,
    private readonly config: ConfigService,
  ) {}
  async runPortfolio(timeframe: Timeframe, includeProtectedHoldout = false) {
    if (timeframe !== Timeframe.FOUR_HOURS)
      throw new BadRequestException(
        "The active Maker strategy operates only on closed 4h candles with a Daily EMA200 filter.",
      );
    const evaluatedAt = Date.now(),
      days = Number(this.config.get("BACKTEST_HOLDOUT_DAYS", 365));
    if (!Number.isInteger(days) || days <= 0)
      throw new Error("Invalid protected holdout duration.");
    const end = includeProtectedHoldout
      ? evaluatedAt
      : evaluatedAt - days * 86_400_000;
    for (const symbol of supportedTradingSymbols)
      this.strategy.setDailyHistory(
        symbol,
        await this.marketData.getHistoricalCandles(symbol, Timeframe.ONE_DAY),
      );
    const datasets = Object.fromEntries(
      await Promise.all(
        supportedTradingSymbols.map(async (symbol) => [
          symbol,
          (
            await this.marketData.getHistoricalCandles(symbol, timeframe)
          ).filter((c) => +c.time + 14_400_000 <= end),
        ]),
      ),
    );
    const executionDatasets = Object.fromEntries(
      await Promise.all(
        supportedTradingSymbols.map(async (symbol) => [
          symbol,
          (
            await this.marketData.getHistoricalCandles(
              symbol,
              Timeframe.ONE_HOUR,
            )
          ).filter((c) => +c.time + 3_600_000 <= end),
        ]),
      ),
    );
    const report = simulateSpotBasket(datasets, this.strategy, {
      executionDatasets,
      startingBalanceEUR: Number(
        this.config.get("DEMO_STARTING_BALANCE_EUR", 1000),
      ),
      riskPerTrade: Math.min(
        Number(this.config.get("DEMO_RISK_PER_TRADE_PERCENT", 0.01)),
        0.01,
      ),
      maximumInvestedEUR: Math.min(
        Number(this.config.get("DEMO_POSITION_SIZE_EUR", 100)),
        100,
      ),
    });
    return {
      ...report,
      includesProtectedHoldout: includeProtectedHoldout,
      databaseWrites: 0,
      realOrders: 0,
    };
  }
}
