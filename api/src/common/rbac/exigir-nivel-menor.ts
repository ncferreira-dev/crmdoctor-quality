import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../types/auth-user';

// Regra de hierarquia do RBAC (CLAUDE.md): só se gerencia quem tem nível MENOR
// que o seu. Centralizado aqui porque cargos e usuários repetiam esse mesmo
// check em vários pontos — e a comparação é sempre por Cargo.nivel, nunca por
// nome de cargo.
export function exigirNivelMenor(
  nivel: number,
  requestUser: AuthUser,
  mensagem: string,
): void {
  if (nivel >= requestUser.cargoNivel) {
    throw new ForbiddenException(mensagem);
  }
}
