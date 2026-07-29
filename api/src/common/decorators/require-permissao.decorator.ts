import { SetMetadata } from '@nestjs/common';
import { Permissao } from '../constants/permissoes';

export const PERMISSAO_KEY = 'permissao';
export const RequirePermissao = (permissao: Permissao) => SetMetadata(PERMISSAO_KEY, permissao);
