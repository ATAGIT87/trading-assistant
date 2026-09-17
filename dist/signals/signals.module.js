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
const signals_service_1 = require("./signals.service");
const market_data_module_1 = require("../market-data/market-data.module");
const signals_controller_1 = require("./signals.controller");
const indicators_module_1 = require("../indicators/indicators.module");
const market_data_token_1 = require("./market-data.token");
const market_data_service_1 = require("../market-data/market-data.service");
const typeorm_1 = require("@nestjs/typeorm");
const signal_entity_1 = require("./entities/signal.entity");
let SignalsModule = class SignalsModule {
};
exports.SignalsModule = SignalsModule;
exports.SignalsModule = SignalsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            market_data_module_1.MarketDataModule,
            indicators_module_1.IndicatorsModule,
            typeorm_1.TypeOrmModule.forFeature([signal_entity_1.Signal]),
        ],
        providers: [
            signals_service_1.SignalsService,
            {
                provide: market_data_token_1.MARKET_DATA_SERVICE,
                useExisting: market_data_service_1.MarketDataService,
            },
        ],
        exports: [signals_service_1.SignalsService],
        controllers: [signals_controller_1.SignalsController],
    })
], SignalsModule);
//# sourceMappingURL=signals.module.js.map