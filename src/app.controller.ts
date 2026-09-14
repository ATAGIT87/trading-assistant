import { Controller, Get, Patch, Param, Body } from "@nestjs/common";
import { UpdateAssetDto } from "./assets/dto/update-asset.dto";
import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
