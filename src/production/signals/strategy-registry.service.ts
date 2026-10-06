import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmaRsiSpotStrategy } from "../trading/ema-rsi-spot.strategy";

/** Production knows only the one live strategy. Research has its own registry. */
@Injectable()
export class StrategyRegistryService {
  private readonly activeVersion: string | null;

  constructor(
    config: ConfigService,
    private readonly strategy: EmaRsiSpotStrategy,
  ) {
    const selected = config.get<string>("ACTIVE_STRATEGY_VERSION", "");
    if (selected && selected !== strategy.version)
      throw new Error("Only ccxt-ema50-rsi14-v1 can drive live entries.");
    this.activeVersion = selected === strategy.version ? selected : null;
  }

  getActive(): EmaRsiSpotStrategy | null {
    return this.activeVersion ? this.strategy : null;
  }

  getActiveVersion(): string | null {
    return this.activeVersion;
  }
}
