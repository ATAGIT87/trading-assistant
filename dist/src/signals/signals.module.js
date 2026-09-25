"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignalsModule = void 0;
const common_1 = require("@nestjs/common");
const market_data_module_1 = require("../market-data/market-data.module");
const indicators_module_1 = require("../indicators/indicators.module");
const risk_module_1 = require("../risk/risk.module");
const signals_controller_1 = require("./signals.controller");
const signals_service_1 = require("./signals.service");
const strategy_v2_service_1 = require("./strategy-v2.service");
const market_data_service_1 = require("../market-data/market-data.service");
const market_data_token_1 = require("./market-data.token");
let SignalsModule = class SignalsModule {
};
exports.SignalsModule = SignalsModule;
exports.SignalsModule = SignalsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            market_data_module_1.MarketDataModule,
            indicators_module_1.IndicatorsModule,
            risk_module_1.RiskModule,
        ],
        controllers: [signals_controller_1.SignalsController],
        providers: [
            {
                provide: market_data_token_1.MARKET_DATA_SERVICE,
                useExisting: market_data_service_1.MarketDataService,
            },
            signals_service_1.SignalsService,
            strategy_v2_service_1.StrategyV2Service,
        ],
        exports: [
            signals_service_1.SignalsService,
            strategy_v2_service_1.StrategyV2Service,
        ],
    })
], SignalsModule);
//# sourceMappingURL=signals.module.js.map