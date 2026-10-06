import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Timeframe } from "../../../src/production/assets/enums/timeframe.enum";
import { MarketCandle } from "../../../src/production/market-data/entities/market-candle.entity";
import { MarketDataService } from "../../../src/production/market-data/market-data.service";

/** Historical higher-timeframe preparation, explicitly invoked only in research. */
@Injectable()
export class ResearchMarketDataService {
  constructor(
    private readonly marketData: MarketDataService,
    @InjectRepository(MarketCandle)
    private readonly candles: Repository<MarketCandle>,
  ) {}

  async buildFourHourCandles(symbol: string): Promise<number> {
    const rows = await this.marketData.getHistoricalCandles(
      symbol,
      Timeframe.ONE_HOUR,
    );
    const hourlyCandles = rows.filter(
      (candle) => +candle.time + 3_600_000 <= Date.now(),
    );

    if (hourlyCandles.length === 0) {
      return 0;
    }

    const groups = new Map<number, MarketCandle[]>();

    for (const candle of hourlyCandles) {
      const time = new Date(candle.time);

      const alignedHour = Math.floor(time.getUTCHours() / 4) * 4;

      const startTime = new Date(time);

      startTime.setUTCHours(alignedHour, 0, 0, 0);

      const key = startTime.getTime();

      const group = groups.get(key) ?? [];

      group.push(candle);
      groups.set(key, group);
    }

    const fourHourCandles: MarketCandle[] = [];

    for (const [startTime, candles] of groups) {
      candles.sort((a, b) => a.time.getTime() - b.time.getTime());

      if (candles.length !== 4) {
        continue;
      }

      const first = candles[0];
      const last = candles[candles.length - 1];

      const high = Math.max(...candles.map((candle) => Number(candle.high)));

      const low = Math.min(...candles.map((candle) => Number(candle.low)));

      const volume = candles.reduce(
        (sum, candle) => sum + Number(candle.volume),
        0,
      );

      const fourHourCandle = new MarketCandle();

      fourHourCandle.symbol = symbol;

      fourHourCandle.timeframe = Timeframe.FOUR_HOURS;

      fourHourCandle.time = new Date(startTime);

      fourHourCandle.open = first.open;

      fourHourCandle.high = high.toString();

      fourHourCandle.low = low.toString();

      fourHourCandle.close = last.close;

      fourHourCandle.volume = volume.toString();

      fourHourCandles.push(fourHourCandle);
    }

    await this.candles.manager.transaction(async (manager) => {
      await manager.delete(MarketCandle, {
        symbol,
        timeframe: Timeframe.FOUR_HOURS,
      });
      for (let start = 0; start < fourHourCandles.length; start += 500)
        await manager.save(
          MarketCandle,
          fourHourCandles.slice(start, start + 500),
        );
    });

    return fourHourCandles.length;
  }
}
