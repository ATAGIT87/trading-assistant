"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DemoTradingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const market_data_module_1 = require("../market-data/market-data.module");
const backtesting_module_1 = require("../backtesting/backtesting.module");
const signals_module_1 = require("../signals/signals.module");
const config_1 = require("@nestjs/config");
const demo_trading_controller_1 = require("./demo-trading.controller");
const demo_trading_scheduler_1 = require("./demo-trading.scheduler");
const demo_trading_service_1 = require("./demo-trading.service");
const telegram_notification_service_1 = require("./telegram-notification.service");
const demo_position_entity_1 = require("./entities/demo-position.entity");
let DemoTradingModule = class DemoTradingModule {
};
exports.DemoTradingModule = DemoTradingModule;
exports.DemoTradingModule = DemoTradingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            typeorm_1.TypeOrmModule.forFeature([demo_position_entity_1.DemoPosition]),
            signals_module_1.SignalsModule,
            market_data_module_1.MarketDataModule,
            backtesting_module_1.BacktestingModule,
        ],
        providers: [demo_trading_service_1.DemoTradingService, demo_trading_scheduler_1.DemoTradingScheduler, telegram_notification_service_1.TelegramNotificationService],
        controllers: [demo_trading_controller_1.DemoTradingController],
        exports: [demo_trading_service_1.DemoTradingService, telegram_notification_service_1.TelegramNotificationService],
    })
], DemoTradingModule);
//# sourceMappingURL=demo-trading.module.js.map