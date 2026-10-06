import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ValidationPipe } from "@nestjs/common";
import { Repository } from "typeorm";
import { MarketDataController } from "../../src/production/market-data/market-data.controller";
import { MarketDataService } from "../../src/production/market-data/market-data.service";
import { MarketCandleStorageService } from "../../src/production/market-data/market-candle-storage.service";
import {
  MarketDataProviderService,
  SpotCandle,
} from "../../src/production/market-data/market-data-provider.service";
import { MarketCandle } from "../../src/production/market-data/entities/market-candle.entity";
import { Timeframe } from "../../src/production/assets/enums/timeframe.enum";
import { UpdateAssetDto } from "../../src/production/assets/dto/update-asset.dto";

test("manual sync uses the same closed-candle ingestion as scheduled reconciliation", async () => {
  const currentHour = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const received: SpotCandle[] = [currentHour - 3_600_000, currentHour].map(
    (time) => ({
      time: new Date(time),
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 10,
    }),
  );
  const saved: MarketCandle[] = [];
  const repository = {
    create: (candle: MarketCandle) => candle,
    save: async (candle: MarketCandle) => {
      saved.push(candle);
      return candle;
    },
  } as unknown as Repository<MarketCandle>;
  const provider = {
    getSpotCandles: async () => received,
  } as unknown as MarketDataProviderService;
  const service = new MarketDataService(
    new MarketCandleStorageService(repository),
    provider,
  );
  const controller = new MarketDataController(service);
  const result = await controller.syncSpotCandles("BTCEUR", Timeframe.ONE_HOUR);
  assert.equal(result.saved, 1);
  assert.equal(saved.length, 1);
  assert.equal(+saved[0].time, currentHour - 3_600_000);
  assert.equal(saved[0].symbol, "BTCEUR");
  assert.equal(saved[0].volume, "10");
});

test("active asset administration accepts an explicit pause through the validated API", async () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const result = (await pipe.transform(
    { isActive: false },
    { type: "body", metatype: UpdateAssetDto },
  )) as UpdateAssetDto;
  assert.equal(result.isActive, false);
  await assert.rejects(() =>
    pipe.transform(
      { isActive: "false" },
      { type: "body", metatype: UpdateAssetDto },
    ),
  );
});
