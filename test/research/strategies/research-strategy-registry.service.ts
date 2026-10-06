import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EmaRsiReplayStrategy } from "./ema-rsi-replay.strategy";
import { TradingStrategy } from "./trading-strategy.port";
import { StrategyRegistryService } from "../../../src/production/signals/strategy-registry.service";
import { HourlyFourHourVolumeResearchStrategy } from "./hourly-four-hour-volume-research.strategy";
import { HourlyProfitExitResearchStrategy } from "./hourly-profit-exit-research.strategy";
import { HourlyTechnicalQualityResearchStrategy } from "./hourly-technical-quality-research.strategy";
import { HourlySetupStructureResearchStrategy } from "./hourly-setup-structure-research.strategy";
import { HourlyIntegratedSpotResearchStrategy } from "./hourly-integrated-spot-research.strategy";

@Injectable()
export class ResearchStrategyRegistryService extends StrategyRegistryService {
  private readonly candidates: Map<string, TradingStrategy>;

  constructor(
    config: ConfigService,
    emaRsi: EmaRsiReplayStrategy,
    fourHour: HourlyFourHourVolumeResearchStrategy,
    profit: HourlyProfitExitResearchStrategy,
    technical: HourlyTechnicalQualityResearchStrategy,
    setup: HourlySetupStructureResearchStrategy,
    integrated: HourlyIntegratedSpotResearchStrategy,
  ) {
    super(config, emaRsi);
    this.candidates = new Map(
      [fourHour, profit, technical, setup, integrated, emaRsi].map(
        (strategy) => [strategy.version, strategy],
      ),
    );
  }

  get(version?: string): TradingStrategy {
    const selected = version ?? this.getActiveVersion();
    const strategy = selected ? this.candidates.get(selected) : undefined;
    if (!strategy)
      throw new BadRequestException(`Unknown research strategy: ${selected}.`);
    return strategy;
  }
}
