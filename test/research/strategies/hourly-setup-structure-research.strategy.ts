import { Injectable } from "@nestjs/common";
import { HourlyTechnicalQualityResearchStrategy } from "./hourly-technical-quality-research.strategy";

/** Frozen correction candidate; old position policies remain unchanged. */
@Injectable()
export class HourlySetupStructureResearchStrategy extends HourlyTechnicalQualityResearchStrategy {
  override readonly version: string = "research-hourly-setup-structure-v6";
  protected override readonly setupStructure = true;
}
