import { Injectable } from '@nestjs/common';
import { TradingSignal } from './signal.types';

@Injectable()
export class SignalsService {
  determineAction(
    marketCondition: TradingSignal['marketCondition'],
  ): TradingSignal['action'] {
    if (marketCondition === 'BULLISH_CONTINUATION') {
      return 'BUY';
    }

    if (marketCondition === 'BEARISH_CONTINUATION') {
      return 'SELL';
    }

    return 'WAIT';
  }
}

