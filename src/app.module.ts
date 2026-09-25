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
      host: "localhost",
      port: 5432,
      username: "postgres",
      password: "admin",
      database: "trading_assistant",
      autoLoadEntities: true,
      synchronize: true,
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