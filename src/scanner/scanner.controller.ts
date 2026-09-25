import { Controller, Get, Param, ParseEnumPipe } from "@nestjs/common";
import { ScannerService } from "./scanner.service";
import { Timeframe } from "../assets/enums/timeframe.enum";
import { ParseTradingSymbolPipe } from "../market-data/trading-symbol";
import { ScannerResponseSchema } from "./scanner-response.schema";

@Controller("scanner")
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get(":symbol/:timeframe")
  async scan(
    @Param("symbol", ParseTradingSymbolPipe) symbol: string,
    @Param("timeframe", new ParseEnumPipe(Timeframe)) timeframe: Timeframe,
  ) {
    const result = await this.scannerService.scan(symbol, timeframe);

    return ScannerResponseSchema.parse(result);
  }
}
