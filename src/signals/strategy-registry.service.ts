import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TradingStrategy } from "./trading-strategy.port";
import { ExploratoryHourlyBreakoutStrategy } from "../trading/exploratory-hourly-breakout.strategy";

@Injectable()
export class StrategyRegistryService {
  private readonly strategies = new Map<string, TradingStrategy>();
  private readonly activeVersion: string | null;

  constructor(
    config: ConfigService,
    exploratory: ExploratoryHourlyBreakoutStrategy,
  ) {
    this.strategies.set(exploratory.version, exploratory);
    const selected = config.get<string>("ACTIVE_STRATEGY_VERSION", "");
    this.activeVersion =
      selected && this.strategies.has(selected) ? selected : null;
  }

  getActive(): TradingStrategy | null {
    return this.activeVersion ? this.get(this.activeVersion) : null;
  }

  getActiveVersion(): string | null {
    return this.activeVersion;
  }

  get(version?: string): TradingStrategy {
    const selectedVersion = version ?? this.activeVersion;
    if (!selectedVersion) {
      throw new BadRequestException(
        "No strategy is active. A new candidate must pass research before it can be registered.",
      );
    }

    const strategy = this.strategies.get(selectedVersion);
    if (!strategy) {
      throw new BadRequestException(
        `Unknown or retired strategy version: ${selectedVersion}.`,
      );
    }

    return strategy;
  }

  listVersions(): string[] {
    return [...this.strategies.keys()];
  }
}
