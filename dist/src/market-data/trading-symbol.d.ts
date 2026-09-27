import { PipeTransform } from "@nestjs/common";
export declare const supportedTradingSymbols: readonly ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "ADAUSDT", "DOGEUSDT", "AVAXUSDT", "LINKUSDT", "LTCUSDT"];
export type SupportedTradingSymbol = (typeof supportedTradingSymbols)[number];
export declare function normalizeTradingSymbol(value: string): SupportedTradingSymbol;
export declare class ParseTradingSymbolPipe implements PipeTransform<string, SupportedTradingSymbol> {
    transform(value: string): SupportedTradingSymbol;
}
