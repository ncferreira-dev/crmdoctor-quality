import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSAO_KEY } from '../decorators/require-permissao.decorator';
import { Permissao } from '../constants/permissoes';
import { AuthUser } from '../types/auth-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permissaoRequerida = this.reflector.getAllAndOverride<
      Permissao | undefined
    >(PERMISSAO_KEY, [context.getHandler(), context.getClass()]);

    if (!permissaoRequerida) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const user = request.user;

    if (!user?.permissoes?.includes(permissaoRequerida)) {
      // A mensagem é para quem lê a tela, e o nome interno da permissão não é
      // texto de interface: `USUARIOS_READ` na cara do usuário é jargão de
      // quem escreveu o código. Ele continua saindo, mas num campo à parte, que
      // serve para o suporte e não é o que a tela mostra.
      throw new ForbiddenException({
        statusCode: 403,
        message: 'Seu cargo não tem acesso a esta parte do sistema.',
        permissaoNecessaria: permissaoRequerida,
      });
    }

    return true;
  }
}
