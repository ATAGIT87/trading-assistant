import { Injectable } from '@nestjs/common';

@Injectable()
export class AssetsService {
  getHello(): string {
    return 'Assets service is working';
  }
}