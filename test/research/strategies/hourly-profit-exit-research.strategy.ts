import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IndicatorsService } from "../indicators/indicators.service";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { HourlyFourHourVolumeResearchStrategy } from "./hourly-four-hour-volume-research.strategy";

/** Original entry and structural stop; change only target economics and exits. */
@Injectable()
export class HourlyProfitExitResearchStrategy extends HourlyFourHourVolumeResearchStrategy {
  override readonly version: string = "research-hourly-profit-exit-v2";
  readonly profitProtection = true;
  protected override readonly profitExit = true;
  constructor(
    indicators: IndicatorsService,
    risk: RiskManagerService,
    config: ConfigService,
  ) {
    super(indicators, risk, config);
  }
}
