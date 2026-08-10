import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

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

    // Convite pendente: a conta existe mas ainda não tem senha escolhida pelo
    // dono. Mensagem específica aqui é intencional — não é tentativa de invasão,
    // é alguém que precisa ser direcionado ao primeiro acesso.
    if (user.codigoConviteHash) {
      throw new UnauthorizedException(
        'Primeiro acesso pendente: use o código de convite para definir sua senha',
      );
    }

    const senhaValida = await argon2.verify(user.senhaHash, dto.senha);
    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Só o id vai assinado. Nome, cargo e permissões saem do banco em
    // JwtStrategy.validate() a cada request: se fossem gravados aqui, mudança
    // de cargo ou desativação só valeriam no próximo login, até 7 dias depois.
    // O token também deixa de carregar e-mail e lista de permissões da pessoa,
    // que ficam guardados no navegador dela.
    const payload: JwtPayload = { sub: user.id };

    const accessToken = await this.jwtService.signAsync(payload);
    // Mesmo formato que UsersService.semSegredos devolve, pra o front ter um
    // só tipo de Usuario. Aqui codigoConvite é sempre null (o login acima
    // recusa quem tem convite pendente), mas o campo sai da resposta de todo
    // jeito, em vez de depender dessa garantia continuar valendo.
    const {
      senhaHash: _senhaHash,
      codigoConviteHash: _codigo,
      ...userSemSenha
    } = user;

    return { accessToken, user: { ...userSemSenha, acessoPendente: false } };
  }
}
