import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from '../common/types/auth-user';
import { Permissao } from '../common/constants/permissoes';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { cargo: true },
    });

    if (!user || !user.ativo) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await argon2.verify(user.senhaHash, dto.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload: AuthUser = {
      sub: user.id,
      nome: user.nome,
      email: user.email,
      cargoNivel: user.cargo.nivel,
      permissoes: user.cargo.permissoes as Permissao[],
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const { senhaHash: _senhaHash, ...userSemSenha } = user;

    return { accessToken, user: userSemSenha };
  }
}
