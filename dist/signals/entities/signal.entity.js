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
exports.Signal = void 0;
const typeorm_1 = require("typeorm");
const timeframe_enum_1 = require("../../assets/enums/timeframe.enum");
let Signal = class Signal {
    id;
    symbol;
    timeframe;
    action;
    confidence;
    entryPrice;
    stopLoss;
    takeProfit;
    trend;
    rsi;
    adx;
    marketCondition;
    isStrongSetup;
    reason;
    createdAt;
};
exports.Signal = Signal;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Signal.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Signal.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: timeframe_enum_1.Timeframe,
    }),
    __metadata("design:type", String)
], Signal.prototype, "timeframe", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Signal.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal"),
    __metadata("design:type", Number)
], Signal.prototype, "confidence", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal"),
    __metadata("design:type", Number)
], Signal.prototype, "entryPrice", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { nullable: true }),
    __metadata("design:type", Object)
], Signal.prototype, "stopLoss", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", { nullable: true }),
    __metadata("design:type", Object)
], Signal.prototype, "takeProfit", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Signal.prototype, "trend", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal"),
    __metadata("design:type", Number)
], Signal.prototype, "rsi", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal"),
    __metadata("design:type", Number)
], Signal.prototype, "adx", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Signal.prototype, "marketCondition", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", Boolean)
], Signal.prototype, "isStrongSetup", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Signal.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Signal.prototype, "createdAt", void 0);
exports.Signal = Signal = __decorate([
    (0, typeorm_1.Entity)()
], Signal);
//# sourceMappingURL=signal.entity.js.map