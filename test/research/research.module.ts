import { Module } from "@nestjs/common";
import { AppModule } from "../../src/production/app.module";
import { BacktestingModule } from "./backtesting/backtesting.module";

/** Explicit research process; production never imports this module. */
@Module({ imports: [AppModule, BacktestingModule] })
export class ResearchModule {}
