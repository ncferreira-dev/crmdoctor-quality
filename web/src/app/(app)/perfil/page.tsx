'use client';

import { FormEvent, useId, useState } from 'react';
import { api } from '../../../lib/api';
import { atualizarUsuarioSessao } from '../../../lib/auth';
import { useSessaoUsuario } from '../../../hooks/useSessao';
import { Usuario } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export default function PerfilPage() {
  const usuario = useSessaoUsuario();
  const id = useId();
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erroDados, setErroDados] = useState('');
  const [okDados, setOkDados] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);

  async function salvarDados(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);

    setErroDados('');
    setOkDados(false);
    setSalvandoDados(true);
    try {
      const atualizado = await api.patch<Usuario>('/users/me', {
        nome: String(dados.get('nome')).trim(),
        telefone: String(dados.get('telefone')).trim() || null,
      });
      // Regrava a sessão pra sidebar e o resto do app mostrarem o nome novo
      // sem precisar sair e entrar de novo.
      atualizarUsuarioSessao(atualizado);
      setOkDados(true);
    } catch (e) {
      setErroDados(e instanceof Error ? e.message : 'Não foi possível salvar');
    } finally {
      setSalvandoDados(false);
    }
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = new FormData(form);
    const novaSenha = String(dados.get('novaSenha'));

    if (novaSenha !== String(dados.get('confirmacao'))) {
      setOk(false);
      setErro('As senhas não coincidem');
      return;
    }

    setErro('');
    setOk(false);
    setCarregando(true);
    try {
      await api.patch('/users/me/senha', {
        senhaAtual: String(dados.get('senhaAtual')),
        novaSenha,
      });
      setOk(true);
      form.reset();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível alterar a senha');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div>
      <h1 className="titulo-pagina mb-4">Meu perfil</h1>

      <div className="flex flex-col gap-3 lg:max-w-2xl">
        <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <h2 className="text-xs font-light uppercase tracking-wide text-ink/50">Meus dados</h2>

          <form onSubmit={salvarDados} className="mt-3 flex flex-col gap-4 sm:max-w-sm">
            <Input
              id={`${id}-nome`}
              name="nome"
              label="Nome"
              defaultValue={usuario?.nome ?? ''}
              key={usuario?.nome}
              required
            />
            <Input
              id={`${id}-telefone`}
              name="telefone"
              label="Telefone"
              type="tel"
              defaultValue={usuario?.telefone ?? ''}
              key={usuario?.telefone}
            />

            {erroDados && (
              <p role="alert" className="text-sm text-accent">
                {erroDados}
              </p>
            )}
            {okDados && (
              <p role="status" className="text-sm text-brand">
                Dados atualizados.
              </p>
            )}

            <Button
              type="submit"
              disabled={salvandoDados}
              className="w-full sm:w-auto sm:self-start"
            >
              {salvandoDados ? 'Salvando...' : 'Salvar dados'}
            </Button>
          </form>

          <dl className="mt-4 flex flex-col gap-2.5 border-t border-ink/10 pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-xs text-ink/50">E-mail</dt>
              <dd className="text-sm text-ink">{usuario?.email ?? '--'}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <dt className="text-xs text-ink/50">Cargo</dt>
              <dd className="text-sm text-ink">{usuario?.cargo?.nome ?? '--'}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-relaxed text-ink/45">
            E-mail e cargo são alterados por quem administra o sistema, na tela de Membros. E-mail é
            a sua identidade de login, e cargo é o que define o seu acesso.
          </p>
        </section>

        <section className="rounded-card border border-ink/10 bg-white p-5 shadow-card">
          <h2 className="text-xs font-light uppercase tracking-wide text-ink/50">Alterar senha</h2>

          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4 sm:max-w-sm">
            <Input
              id={`${id}-atual`}
              name="senhaAtual"
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              required
            />
            <Input
              id={`${id}-nova`}
              name="novaSenha"
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Input
              id={`${id}-confirmacao`}
              name="confirmacao"
              label="Confirme a nova senha"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />

            <p className="text-[11px] text-ink/45">Mínimo de 8 caracteres.</p>

            {erro && (
              <p role="alert" className="text-sm text-accent">
                {erro}
              </p>
            )}
            {ok && (
              <p role="status" className="text-sm text-brand">
                Senha alterada. Ela já vale no próximo login.
              </p>
            )}

            <Button type="submit" disabled={carregando} className="w-full sm:w-auto sm:self-start">
              {carregando ? 'Alterando...' : 'Alterar senha'}
            </Button>
          </form>
        </section>
      </div>
    </div>
  );
}
