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
exports.BacktestRun = void 0;
const typeorm_1 = require("typeorm");
const timeframe_enum_1 = require("../../assets/enums/timeframe.enum");
let BacktestRun = class BacktestRun {
    id;
    symbol;
    timeframe;
    strategyVersion;
    result;
    createdAt;
};
exports.BacktestRun = BacktestRun;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], BacktestRun.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BacktestRun.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: timeframe_enum_1.Timeframe }),
    __metadata("design:type", String)
], BacktestRun.prototype, "timeframe", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], BacktestRun.prototype, "strategyVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "jsonb" }),
    __metadata("design:type", Object)
], BacktestRun.prototype, "result", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], BacktestRun.prototype, "createdAt", void 0);
exports.BacktestRun = BacktestRun = __decorate([
    (0, typeorm_1.Entity)()
], BacktestRun);
//# sourceMappingURL=backtest-run.entity.js.map