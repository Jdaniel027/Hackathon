import { HttpException } from '@nestjs/common';

export class AppBadRequestException extends HttpException {
  constructor(code: string, message: string, details: unknown = null) {
    super({ code, message, statusCode: 400, details }, 400);
  }
}
