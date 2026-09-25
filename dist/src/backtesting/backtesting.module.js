"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BacktestingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const market_data_module_1 = require("../market-data/market-data.module");
const signals_module_1 = require("../signals/signals.module");
const backtesting_controller_1 = require("./backtesting.controller");
const backtesting_service_1 = require("./backtesting.service");
const backtest_run_entity_1 = require("./entities/backtest-run.entity");
let BacktestingModule = class BacktestingModule {
};
exports.BacktestingModule = BacktestingModule;
exports.BacktestingModule = BacktestingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([backtest_run_entity_1.BacktestRun]),
            market_data_module_1.MarketDataModule,
            signals_module_1.SignalsModule,
        ],
        controllers: [
            backtesting_controller_1.BacktestingController,
        ],
        providers: [
            backtesting_service_1.BacktestingService,
        ],
        exports: [
            backtesting_service_1.BacktestingService,
        ],
    })
], BacktestingModule);
//# sourceMappingURL=backtesting.module.js.map