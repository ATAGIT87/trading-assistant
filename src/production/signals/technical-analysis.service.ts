import { Injectable } from "@nestjs/common";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { EMA_RSI_STRATEGY_VERSION } from "../trading/ccxt/analyze-market";
import { SignalsService } from "./signals.service";

/** Public diagnosis describes the same snapshot/rule used for live execution. */
@Injectable()
export class TechnicalAnalysisService {
  constructor(private readonly signals: SignalsService) {}

  async analyze(symbol: string) {
    const result = await this.signals.getMarketAnalysis(
      symbol,
      Timeframe.ONE_HOUR,
    );
    const signal = this.signals.signalFromMarketAnalysis(result);
    const { closedHistory: _history, ...snapshot } = result;
    return {
      symbol,
      version: EMA_RSI_STRATEGY_VERSION,
      strategyVersion: signal.strategyVersion,
      evaluatedAt: new Date(),
      status: result.candle ? "OK" : "BLOCKED",
      signal,
      snapshot,
      analysis: signal.analysis,
      interpretation:
        "The same closed-candle EMA50/RSI14 rule drives signals and Demo entries. A pattern match still requires risk, cost and capital admission; no future-profit probability is estimated.",
    };
  }
}
