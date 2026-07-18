import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot(): string {
    return 'OTA SaaS Platform API';
  }
}
