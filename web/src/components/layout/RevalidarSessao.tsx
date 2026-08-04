'use client';

import { useEffect } from 'react';
import { api } from '../../lib/api';
import { atualizarUsuarioSessao } from '../../lib/auth';
import { Usuario } from '../../types';

// O menu e os botões de cada tela se guiam pelas permissões que ficaram
// guardadas no navegador no último login, e o token dura 7 dias. Sem isto,
// quem muda de cargo hoje continua vendo o menu de ontem até sair e entrar
// de novo.
//
// A consulta também é o que derruba na hora quem foi desativado ou teve o
// acesso resetado: a API responde 401 e o api.ts limpa a sessão e manda para
// o login. Erro de rede é engolido de propósito — ficar um instante sem
// internet não é motivo para expulsar ninguém da sessão.
//
// Roda ao abrir o app e toda vez que a aba volta ao foco, que é quando a
// pessoa retoma o trabalho e é o momento certo de checar se ela ainda pode.
export function RevalidarSessao() {
  useEffect(() => {
    function revalidar() {
      api
        .get<Usuario>('/users/me')
        .then(atualizarUsuarioSessao)
        .catch(() => {});
    }

    revalidar();

    function aoVoltarPraAba() {
      if (document.visibilityState === 'visible') {
        revalidar();
      }
    }

    document.addEventListener('visibilitychange', aoVoltarPraAba);
    return () =>
      document.removeEventListener('visibilitychange', aoVoltarPraAba);
  }, []);

  return null;
}
