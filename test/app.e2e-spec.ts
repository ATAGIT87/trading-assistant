import "reflect-metadata";

import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { AppModule } from "../src/app.module";

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication();

  await app.init();

  const response = await request(app.getHttpServer()).get(
    "/backtesting/ETHUSD/15m",
  );

  console.log("E2E status:", response.status);

  const body = response.body;
  const trades = body.trades;

  const wins = trades.filter(
    (trade: any) => trade.result === "WIN",
  ).length;

  const losses = trades.filter(
    (trade: any) => trade.result === "LOSS",
  ).length;

  const totalR = trades.reduce(
    (sum: number, trade: any) =>
      sum + Number(trade.resultR ?? 0),
    0,
  );

  console.log("Backtest validation:", {
    trades: trades.length,
    wins,
    losses,
    totalR,
    reportedTotalTrades: body.totalTrades,
    reportedWinningTrades: body.winningTrades,
    reportedLosingTrades: body.losingTrades,
    reportedWinRate: body.winRate,
    reportedTotalR: body.totalR,
    expectancyR: body.expectancyR,
  });

  await app.close();

  if (response.status >= 500) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});