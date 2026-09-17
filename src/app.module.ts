import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AssetsModule } from "./assets/assets.module";
import { MarketDataModule } from "./market-data/market-data.module";
import { IndicatorsModule } from "./indicators/indicators.module";
import { SignalsModule } from "./signals/signals.module";
import { BacktestingModule } from "./backtesting/backtesting.module";
import { ScannerModule } from "./scanner/scanner.module";

@Module({
  imports: [
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
    AssetsModule,
    MarketDataModule,
    IndicatorsModule,
    SignalsModule,
    BacktestingModule,
    ScannerModule
  ],
})
export class AppModule {}
