"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketCandle = void 0;
const typeorm_1 = require("typeorm");
const timeframe_enum_1 = require("../../assets/enums/timeframe.enum");
let MarketCandle = class MarketCandle {
    id;
    symbol;
    timeframe;
    time;
    open;
    high;
    low;
    close;
    volume;
};
exports.MarketCandle = MarketCandle;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], MarketCandle.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], MarketCandle.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: timeframe_enum_1.Timeframe,
    }),
    __metadata("design:type", String)
], MarketCandle.prototype, "timeframe", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], MarketCandle.prototype, "time", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 20, scale: 8 }),
    __metadata("design:type", String)
], MarketCandle.prototype, "open", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 20, scale: 8 }),
    __metadata("design:type", String)
], MarketCandle.prototype, "high", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 20, scale: 8 }),
    __metadata("design:type", String)
], MarketCandle.prototype, "low", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 20, scale: 8 }),
    __metadata("design:type", String)
], MarketCandle.prototype, "close", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "decimal", precision: 30, scale: 8 }),
    __metadata("design:type", String)
], MarketCandle.prototype, "volume", void 0);
exports.MarketCandle = MarketCandle = __decorate([
    (0, typeorm_1.Unique)(["symbol", "timeframe", "time"]),
    (0, typeorm_1.Entity)()
], MarketCandle);
//# sourceMappingURL=market-candle.entity.js.map