import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AssetsModule } from "./assets/assets.module";
import { BacktestingModule } from "./backtesting/backtesting.module";
import { DemoTradingModule } from "./demo-trading/demo-trading.module";
import { IndicatorsModule } from "./indicators/indicators.module";
import { MarketDataModule } from "./market-data/market-data.module";
import { RiskModule } from "./risk/risk.module";
import { ScannerModule } from "./scanner/scanner.module";
import { SignalsModule } from "./signals/signals.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST ?? "localhost",
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? "postgres",
      password: process.env.DB_PASSWORD ?? "admin",
      database: process.env.DB_DATABASE ?? "trading_assistant",
      autoLoadEntities: true,
      synchronize: process.env.DB_SYNCHRONIZE !== "false",
    }),

    ScheduleModule.forRoot(),

    AssetsModule,
    MarketDataModule,
    IndicatorsModule,
    SignalsModule,
    RiskModule,
    BacktestingModule,
    ScannerModule,
    DemoTradingModule,
  ],
})
export class AppModule {}
