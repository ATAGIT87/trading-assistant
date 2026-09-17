import {
  Controller,
  Get,
  Param,
} from "@nestjs/common";
import { ScannerService } from "./scanner.service";
import { Timeframe } from "../assets/enums/timeframe.enum";

@Controller("scanner")
export class ScannerController {
  constructor(
    private readonly scannerService: ScannerService,
  ) {}

  @Get(":symbol/:timeframe")
  scan(
    @Param("symbol") symbol: string,
    @Param("timeframe") timeframe: Timeframe,
  ) {
    return this.scannerService.scan(
      symbol,
      timeframe,
    );
  }
}