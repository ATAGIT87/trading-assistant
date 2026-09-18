import "reflect-metadata";

import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { SignalResponseSchema } from "../src/signals/signal-response.schema";

async function main() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleRef.createNestApplication();

  await app.init();

  const response = await request(app.getHttpServer()).get(
    "/signals/ETHUSD/15m/14",
  );

  console.log("E2E status:", response.status);

  const body = SignalResponseSchema.parse(response.body);

  console.log("Signal validation:", {
    action: body.action,
    confidence: body.confidence,
    entryPrice: body.entryPrice,
    stopLoss: body.stopLoss,
    takeProfit: body.takeProfit,
    trend: body.trend,
    rsi: body.rsi,
    adx: body.adx,
    marketCondition: body.marketCondition,
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