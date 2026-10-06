import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IndicatorsService } from "../indicators/indicators.service";
import { RiskManagerService } from "../../../src/production/risk/risk-manager.service";
import { HourlyProfitExitResearchStrategy } from "./hourly-profit-exit-research.strategy";

@Injectable()
export class HourlyTechnicalQualityResearchStrategy extends HourlyProfitExitResearchStrategy {
  override readonly version: string = "research-hourly-profit-exit-v3";
  protected override readonly correctedAnalysis = true;
  override readonly minimumTradesPerSegment = 20;
  override readonly minimumContributingSymbols = 2;
  constructor(
    indicators: IndicatorsService,
    risk: RiskManagerService,
    config: ConfigService,
  ) {
    super(indicators, risk, config);
  }
}
