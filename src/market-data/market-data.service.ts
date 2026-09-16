import { ConflictException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, QueryFailedError } from "typeorm";
import { MarketCandle } from "./entities/market-candle.entity";
import { CreateMarketCandleDto } from "./dto/create-market-candle.dto";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { IndicatorsService } from "../indicators/indicators.service";
import { LessThanOrEqual } from "typeorm";
@Injectable()
export class MarketDataService {
  constructor(
    @InjectRepository(MarketCandle)
    private readonly marketCandleRepository: Repository<MarketCandle>,
    private readonly indicatorsService: IndicatorsService,
  ) {}

  async createCandle(dto: CreateMarketCandleDto): Promise<MarketCandle> {
    try {
      const candle = this.marketCandleRepository.create({
        symbol: dto.symbol,
        timeframe: dto.timeframe,
        time: new Date(dto.time),
        open: dto.open.toString(),
        high: dto.high.toString(),
        low: dto.low.toString(),
        close: dto.close.toString(),
        volume: dto.volume.toString(),
      });

      return await this.marketCandleRepository.save(candle);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === "23505"
      ) {
        throw new ConflictException("Candle already exists");
      }

      throw error;
    }
  }
  findAllCandles(): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find();
  }
  findCandlesBySymbol(symbol: string): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
      },
    });
  }

  findCandlesBySymbolAndTimeframe(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "DESC",
      },
      take: 100,
    });
  }

  async findLatestCandle(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle | null> {
    return this.marketCandleRepository.findOne({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "DESC",
      },
    });
  }

  async getLatestPrice(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number | null> {
    const candle = await this.findLatestCandle(symbol, timeframe);

    if (!candle) {
      return null;
    }

    return Number(candle.close);
  }
  async getCandlesForAnalysis(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "ASC",
      },
      take: 100,
    });
  }

  async getLatestRsi(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.indicatorsService.calculateRsiFromCandles(candles, 14);
  }

  async getLatestSma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.indicatorsService.calculateSmaFromCandles(candles, period);
  }

  async getLatestEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.indicatorsService.calculateEma(
      candles.map((candle) => Number(candle.close)),
      period,
    );
  }

  async compareLatestPriceToSma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"ABOVE" | "BELOW" | "EQUAL" | null> {
    const price = await this.getLatestPrice(symbol, timeframe);
    const sma = await this.getLatestSma(symbol, timeframe, period);

    if (price === null || sma === null) {
      return null;
    }

    return this.indicatorsService.comparePriceToAverage(Number(price), sma);
  }

  async compareLatestPriceToEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"ABOVE" | "BELOW" | "EQUAL" | null> {
    const price = await this.getLatestPrice(symbol, timeframe);
    const ema = await this.getLatestEma(symbol, timeframe, period);

    if (price === null || ema === null) {
      return null;
    }

    return this.indicatorsService.comparePriceToAverage(Number(price), ema);
  }

  async compareSmaToEma(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"SMA_ABOVE_EMA" | "SMA_BELOW_EMA" | "SMA_EQUAL_EMA" | null> {
    const sma = await this.getLatestSma(symbol, timeframe, period);
    const ema = await this.getLatestEma(symbol, timeframe, period);

    if (sma === null || ema === null) {
      return null;
    }

    return this.indicatorsService.compareSmaToEma(sma, ema);
  }
  async getTrend(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"BULLISH" | "BEARISH" | "NEUTRAL" | null> {
    const price = await this.getLatestPrice(symbol, timeframe);
    const sma = await this.getLatestSma(symbol, timeframe, period);
    const ema = await this.getLatestEma(symbol, timeframe, period);

    if (price === null || sma === null || ema === null) {
      return null;
    }

    const priceVsSma = this.indicatorsService.comparePriceToAverage(
      Number(price),
      sma,
    );

    const priceVsEma = this.indicatorsService.comparePriceToAverage(
      Number(price),
      ema,
    );

    return this.indicatorsService.determineTrend(priceVsSma, priceVsEma);
  }
  async getRsiStatus(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<"OVERSOLD" | "OVERBOUGHT" | "NEUTRAL" | null> {
    const rsi = await this.getLatestRsi(symbol, timeframe);

    if (rsi === null) {
      return null;
    }

    return this.indicatorsService.classifyRsi(rsi);
  }

  async getMarketCondition(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<
    | "POSSIBLE_REVERSAL"
    | "BEARISH_CONTINUATION"
    | "BULLISH_CONTINUATION"
    | "NEUTRAL"
    | null
  > {
    const trend = await this.getTrend(symbol, timeframe, period);

    const rsiStatus = await this.getRsiStatus(symbol, timeframe, period);

    if (trend === null || rsiStatus === null) {
      return null;
    }

    return this.indicatorsService.determineMarketCondition(trend, rsiStatus);
  }

  async getLatestAtr(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    if (candles.length < period + 1) {
      return null;
    }

    const trueRanges = this.indicatorsService.calculateTrueRangesFromCandles(
      candles.map((candle) => ({
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      })),
    );

    return this.indicatorsService.calculateAtr(trueRanges, period);
  }

  async getLatestAdx(
    symbol: string,
    timeframe: Timeframe,
    period: number,
  ): Promise<number | null> {
    const candles = await this.getCandlesForAnalysis(symbol, timeframe);

    return this.indicatorsService.calculateAdxFromCandles(
      candles.map((candle) => ({
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
      })),
      period,
    );
  }

  async getHistoricalCandles(
    symbol: string,
    timeframe: Timeframe,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
      },
      order: {
        time: "ASC",
      },
    });
  }

  async getHistoricalCandlesUntil(
    symbol: string,
    timeframe: Timeframe,
    until: Date,
  ): Promise<MarketCandle[]> {
    return this.marketCandleRepository.find({
      where: {
        symbol,
        timeframe,
        time: LessThanOrEqual(until),
      },
      order: {
        time: "ASC",
      },
    });
  }
}
