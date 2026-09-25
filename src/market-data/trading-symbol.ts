import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

export const supportedTradingSymbols = ["BTCUSD", "ETHUSD"] as const;
export type SupportedTradingSymbol = (typeof supportedTradingSymbols)[number];

export function normalizeTradingSymbol(value: string): SupportedTradingSymbol {
  const symbol = value.trim().toUpperCase();

  if (!supportedTradingSymbols.includes(symbol as SupportedTradingSymbol)) {
    throw new BadRequestException(
      `Unsupported symbol: ${value}. Supported symbols: ${supportedTradingSymbols.join(", ")}.`,
    );
  }

  return symbol as SupportedTradingSymbol;
}

@Injectable()
export class ParseTradingSymbolPipe implements PipeTransform<string, SupportedTradingSymbol> {
  transform(value: string): SupportedTradingSymbol {
    return normalizeTradingSymbol(value);
  }
}
