import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AlertDelivery } from "./entities/alert-delivery.entity";
import { AlertsService } from "./alerts.service";

@Module({
  imports: [TypeOrmModule.forFeature([AlertDelivery])],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
