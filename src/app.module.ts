import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AssetsModule } from "./assets/assets.module";

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
  ],
})
export class AppModule {}
