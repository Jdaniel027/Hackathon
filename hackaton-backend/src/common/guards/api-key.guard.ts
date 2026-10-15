import { timingSafeEqual } from 'node:crypto';
import { CanActivate, Injectable } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_ADMIN_KEY } from '../constants/metadata.constants.js';
import { APP_ERRORS } from '../exception/app-exception.js';

// Guard global: solo exige x-api-key en rutas marcadas con @Admin().
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requerido = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requerido) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const proporcionada = request.header('x-api-key') ?? '';
    const esperada = this.config.get<string>('ADMIN_API_KEY') ?? '';

    if (!proporcionada) {
      throw APP_ERRORS.ADMIN_KEY_MISSING();
    }
    if (!esperada || !this.esIgual(proporcionada, esperada)) {
      throw APP_ERRORS.ADMIN_KEY_INVALIDA();
    }
    return true;
  }

  // Comparación en tiempo constante para no filtrar la clave por timing.
  private esIgual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
