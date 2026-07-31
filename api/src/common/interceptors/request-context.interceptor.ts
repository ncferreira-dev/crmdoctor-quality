import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { runWith } from '../context/request-context';
import { AuthUser } from '../types/auth-user';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    return new Observable((subscriber) => {
      runWith({ usuarioId: request.user?.sub }, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
