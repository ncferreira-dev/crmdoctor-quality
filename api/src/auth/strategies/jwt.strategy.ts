import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types/auth-user';
import { Permissao } from '../../common/constants/permissoes';

// O que o login assina. Só o `sub` entra: quem é a pessoa não muda, mas cargo,
// permissões e status mudam, e o token vale 7 dias. Guardar essas coisas aqui
// dentro faria o token responder pela realidade de até uma semana atrás.
export interface JwtPayload {
  sub: string;
  iat?: number;
}

// Um token emitido antes da senha atual é de uma sessão que a troca de senha
// deveria ter encerrado. `iat` vem em segundos e arredondado para baixo, então
// a comparação também é em segundos: sem isso, o login feito no mesmo segundo
// em que a senha foi definida se invalidaria sozinho.
export function tokenAnteriorASenhaAtual(
  senhaDefinidaEm: Date | null,
  iat: number | undefined,
): boolean {
  if (!senhaDefinidaEm || iat === undefined) {
    return false;
  }
  return iat < Math.floor(senhaDefinidaEm.getTime() / 1000);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Roda em toda request autenticada e é o único ponto que decide o que a
  // pessoa pode fazer agora. O custo é uma consulta por request; em troca,
  // desativar um membro, trocar o cargo dele ou resetar o acesso surte efeito
  // na hora, e não no próximo login dele — que pode levar uma semana.
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { cargo: true },
    });

    // Todas as recusas abaixo são 401 e não 403: não é falta de permissão para
    // uma rota, é a sessão que deixou de valer. O front trata 401 limpando a
    // sessão e mandando para o login, que é exatamente o desfecho certo aqui.
    if (!user) {
      throw new UnauthorizedException('Sessão inválida');
    }

    if (!user.ativo) {
      throw new UnauthorizedException('Conta desativada');
    }

    // Código de convite pendente significa que alguém redefiniu o acesso desta
    // conta (reenviar-convite ou o break-glass resetar-acesso). Os dois anunciam
    // que a senha antiga morre na hora; sem esta linha, quem já estava logado
    // seguiria dentro com o token na mão e o break-glass não fecharia porta
    // nenhuma.
    if (user.codigoConviteHash) {
      throw new UnauthorizedException(
        'Acesso redefinido: use o código de primeiro acesso',
      );
    }

    if (tokenAnteriorASenhaAtual(user.senhaDefinidaEm, payload.iat)) {
      throw new UnauthorizedException('Senha alterada: entre novamente');
    }

    return {
      sub: user.id,
      nome: user.nome,
      email: user.email,
      cargoNivel: user.cargo.nivel,
      permissoes: user.cargo.permissoes as Permissao[],
    };
  }
}
