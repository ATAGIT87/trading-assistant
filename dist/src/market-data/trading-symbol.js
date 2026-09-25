"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseTradingSymbolPipe = exports.supportedTradingSymbols = void 0;
exports.normalizeTradingSymbol = normalizeTradingSymbol;
const common_1 = require("@nestjs/common");
exports.supportedTradingSymbols = ["BTCUSD", "ETHUSD"];
function normalizeTradingSymbol(value) {
    const symbol = value.trim().toUpperCase();
    if (!exports.supportedTradingSymbols.includes(symbol)) {
        throw new common_1.BadRequestException(`Unsupported symbol: ${value}. Supported symbols: ${exports.supportedTradingSymbols.join(", ")}.`);
    }
    return symbol;
}
let ParseTradingSymbolPipe = class ParseTradingSymbolPipe {
    transform(value) {
        return normalizeTradingSymbol(value);
    }
};
exports.ParseTradingSymbolPipe = ParseTradingSymbolPipe;
exports.ParseTradingSymbolPipe = ParseTradingSymbolPipe = __decorate([
    (0, common_1.Injectable)()
], ParseTradingSymbolPipe);
//# sourceMappingURL=trading-symbol.js.map