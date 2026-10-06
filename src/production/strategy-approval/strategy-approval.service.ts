import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { supportedTradingSymbols } from "../market-data/trading-symbol";
import { StrategyRegistryService } from "../signals/strategy-registry.service";
import { StrategyEvidence } from "./entities/strategy-evidence.entity";
import { applyPortfolioCapacity } from "./evidence-capacity";
import { EVIDENCE_ENGINE_VERSION } from "./evidence-engine";

/** Reads existing evidence for entry admission; never runs research or writes evidence. */
@Injectable()
export class StrategyApprovalService {
  private readonly engineVersion = EVIDENCE_ENGINE_VERSION;

  constructor(
    private readonly strategyRegistry: StrategyRegistryService,
    private readonly configService: ConfigService,
    @InjectRepository(StrategyEvidence)
    private readonly evidenceRepository: Repository<StrategyEvidence>,
  ) {}

  async getReadiness(timeframe: Timeframe) {
    const activeStrategy = this.strategyRegistry.getActive();
    if (!activeStrategy)
      return {
        isReady: false,
        strategyVersion: null,
        reason: "No strategy is active.",
      };
    return this.getPortfolioReadiness(
      timeframe,
      activeStrategy.version,
      activeStrategy.minimumTradesPerSegment,
      activeStrategy.minimumContributingSymbols,
    );
  }

  private async getPortfolioReadiness(
    timeframe: Timeframe,
    strategyVersion: string,
    minimumTradesPerSegment: number,
    minimumContributingSymbols: number,
  ) {
    const runs = await this.evidenceRepository.find({
      where: { timeframe, strategyVersion },
      order: { createdAt: "DESC" },
    });
    const latestBySymbol = new Map<string, StrategyEvidence>();
    for (const run of runs) {
      if (!latestBySymbol.has(run.symbol)) latestBySymbol.set(run.symbol, run);
    }
    const members = supportedTradingSymbols.map((symbol) =>
      latestBySymbol.get(symbol),
    );
    const missing = supportedTradingSymbols.filter(
      (symbol) => !latestBySymbol.has(symbol),
    );
    if (missing.length > 0) {
      return {
        isReady: false,
        strategyVersion,
        reason: `Portfolio approval blocked: missing current runs for ${missing.join(", ")}.`,
      };
    }

    const completeRuns = members as StrategyEvidence[];
    const invalidRun = completeRuns.find(
      (run) =>
        run.result.researchContext?.engineVersion !== this.engineVersion ||
        !run.result.dataQuality?.primary?.isUsableForResearch ||
        (run.result.dataQuality?.higherTimeframe !== null &&
          !run.result.dataQuality?.higherTimeframe?.isUsableForResearch) ||
        !run.result.includesProtectedHoldout ||
        !run.result.protectedHoldout,
    );
    if (invalidRun) {
      return {
        isReady: false,
        strategyVersion,
        reason:
          "Portfolio approval blocked: every member needs a current, quality-approved run with a separate protected holdout.",
      };
    }

    if (
      completeRuns.some(
        (run) => run.result.researchContext.executionResolution !== "1m",
      )
    ) {
      return {
        isReady: false,
        strategyVersion,
        reason:
          "Portfolio approval blocked: minute-monitored Demo requires validated 1m execution evidence; hourly or unlabelled fills are insufficient.",
      };
    }

    const maxOpenPositions = this.getMaxPortfolioPositions();
    const aggregate = (segment: "validation" | "test" | "protectedHoldout") => {
      const eligibleTrades = completeRuns.flatMap((run) =>
        run.result.trades.filter((trade) => trade.segment === segment),
      );
      const acceptedTrades = applyPortfolioCapacity(
        eligibleTrades,
        maxOpenPositions,
      );
      const completedTrades = acceptedTrades.filter(
        (trade) => trade.resultR !== null,
      );
      const totalTrades = completedTrades.length;
      const totalR = completedTrades.reduce(
        (sum, trade) => sum + (trade.resultR ?? 0),
        0,
      );
      return {
        totalTrades,
        totalR,
        expectancyR: totalTrades === 0 ? 0 : totalR / totalTrades,
        contributingSymbols: new Set(
          completedTrades.map((trade) => trade.symbol),
        ).size,
      };
    };
    const validation = aggregate("validation");
    const test = aggregate("test");
    const protectedHoldout = aggregate("protectedHoldout");
    const segments = [validation, test, protectedHoldout];
    const isReady = segments.every(
      (segment) =>
        segment.totalTrades >= minimumTradesPerSegment &&
        segment.totalR > 0 &&
        segment.expectancyR > 0 &&
        segment.contributingSymbols >= minimumContributingSymbols,
    );

    return {
      isReady,
      strategyVersion,
      evaluationScope: "PORTFOLIO" as const,
      validation,
      test,
      protectedHoldout,
      reason: isReady
        ? "Capacity-constrained portfolio out-of-sample and protected-holdout criteria passed."
        : `Portfolio criteria failed: with at most ${maxOpenPositions} open position(s), require >=${minimumTradesPerSegment} trades, positive net R/expectancy, and >=${minimumContributingSymbols} contributing symbols in every segment.`,
    };
  }

  private getMaxPortfolioPositions(): number {
    const configured = Number(
      this.configService.get("MAX_DEMO_OPEN_POSITIONS", 1),
    );
    return Number.isInteger(configured) && configured > 0 ? configured : 1;
  }
}
