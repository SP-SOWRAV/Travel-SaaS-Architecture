import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

export interface JwtPayload {
  userId: string;
  tenantId: string | null;
  role: string;
}

@Injectable()
export class JwtService {
  constructor(private readonly nestJwtService: NestJwtService) {}

  sign(payload: JwtPayload): string {
    return this.nestJwtService.sign(payload);
  }

  verify(token: string): JwtPayload {
    return this.nestJwtService.verify<JwtPayload>(token);
  }
}
