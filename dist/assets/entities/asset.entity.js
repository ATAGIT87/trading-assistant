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
exports.Asset = void 0;
const typeorm_1 = require("typeorm");
const asset_type_enum_1 = require("../enums/asset-type.enum");
const timeframe_enum_1 = require("../enums/timeframe.enum");
let Asset = class Asset {
    id;
    symbol;
    name;
    type;
    isActive;
    timeframe;
};
exports.Asset = Asset;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Asset.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Asset.prototype, "symbol", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Asset.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: asset_type_enum_1.AssetType,
    }),
    __metadata("design:type", String)
], Asset.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], Asset.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: timeframe_enum_1.Timeframe,
        default: timeframe_enum_1.Timeframe.ONE_HOUR,
    }),
    __metadata("design:type", String)
], Asset.prototype, "timeframe", void 0);
exports.Asset = Asset = __decorate([
    (0, typeorm_1.Entity)()
], Asset);
//# sourceMappingURL=asset.entity.js.map