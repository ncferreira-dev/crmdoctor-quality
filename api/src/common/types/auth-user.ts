import { Permissao } from '../constants/permissoes';

export interface AuthUser {
  sub: string;
  nome: string;
  email: string;
  cargoNivel: number;
  permissoes: Permissao[];
}
