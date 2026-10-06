import { TradingAssistantModule } from "./trading/ccxt/trading-assistant.module";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { TypeOrmModule } from "@nestjs/typeorm";

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
      // Schema synchronization can mutate a long-lived database at startup.
      // It is opt-in for throwaway local development only; durable instances
      // must use reviewed migrations.
      synchronize: process.env.DB_SYNCHRONIZE === "true",
    }),

    ScheduleModule.forRoot(),
    // The runtime feature module owns its dependencies and their controllers.
    TradingAssistantModule,
  ],
})
export class AppModule {}
