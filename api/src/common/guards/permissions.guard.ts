import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSAO_KEY } from '../decorators/require-permissao.decorator';
import { Permissao } from '../constants/permissoes';
import { AuthUser } from '../types/auth-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissaoRequerida = this.reflector.getAllAndOverride<Permissao | undefined>(PERMISSAO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!permissaoRequerida) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user?.permissoes?.includes(permissaoRequerida)) {
      throw new ForbiddenException(`Permissão necessária: ${permissaoRequerida}`);
    }

    return true;
  }
}
