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
exports.AlertDelivery = void 0;
const typeorm_1 = require("typeorm");
const timeframe_enum_1 = require("../../assets/enums/timeframe.enum");
let AlertDelivery = class AlertDelivery {
    id;
    symbol;
    timeframe;
    candleTime;
    action;
    sentAt;
};
exports.AlertDelivery = AlertDelivery;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], AlertDelivery.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], AlertDelivery.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "enum", enum: timeframe_enum_1.Timeframe }),
    __metadata("design:type", String)
], AlertDelivery.prototype, "timeframe", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "timestamptz" }),
    __metadata("design:type", Date)
], AlertDelivery.prototype, "candleTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "varchar" }),
    __metadata("design:type", Object)
], AlertDelivery.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], AlertDelivery.prototype, "sentAt", void 0);
exports.AlertDelivery = AlertDelivery = __decorate([
    (0, typeorm_1.Entity)(),
    (0, typeorm_1.Unique)(["symbol", "timeframe", "candleTime", "action"])
], AlertDelivery);
//# sourceMappingURL=alert-delivery.entity.js.map