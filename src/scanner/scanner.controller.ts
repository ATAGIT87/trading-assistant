import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ScannerService } from "./scanner.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { ScannerResponseSchema } from "./scanner-response.schema";

@Controller("scanner")
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get(":symbol/:timeframe/:period")
  async scan(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
    @Param("period", ParseIntPipe) period: number,
  ) {
   const result = await this.scannerService.scan(
  symbol,
  timeframe,
  period,
);

return ScannerResponseSchema.parse(result);
  }
}
