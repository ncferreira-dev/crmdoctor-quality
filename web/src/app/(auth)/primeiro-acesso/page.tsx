'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [pronto, setPronto] = useState(false);

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);
    const senha = String(form.get('senha'));
    const confirmacao = String(form.get('confirmacao'));

    if (senha !== confirmacao) {
      setErro('As senhas não coincidem');
      return;
    }

    setErro('');
    setCarregando(true);
    try {
      await api.post('/users/resgatar-convite', {
        codigo: String(form.get('codigo')).trim(),
        senha,
      });
      setPronto(true);
      // Pequena pausa pra pessoa ler a confirmação antes de ir pro login.
      setTimeout(() => router.push('/login'), 1800);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir o primeiro acesso');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-overlay">
        <h1 className="titulo-pagina">Primeiro acesso</h1>
        <p className="mb-6 mt-1.5 text-[10px] font-light uppercase tracking-[0.18em] text-ink/40">
          Doctor Quality
        </p>

        {pronto ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/70">
              Senha definida com sucesso. Redirecionando para o login...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="codigo"
              name="codigo"
              label="Código de acesso"
              placeholder="00000000"
              inputMode="numeric"
              className="dado tracking-[0.2em]"
              required
              autoFocus
            />
            <Input
              id="senha"
              name="senha"
              label="Crie sua senha"
              type="password"
              minLength={8}
              required
            />
            <Input
              id="confirmacao"
              name="confirmacao"
              label="Confirme a senha"
              type="password"
              minLength={8}
              required
            />

            <p className="text-[11px] text-ink/45">Mínimo de 8 caracteres.</p>

            {erro && (
              <p role="alert" className="text-sm text-accent">
                {erro}
              </p>
            )}

            <Button type="submit" disabled={carregando} className="mt-1 w-full">
              {carregando ? 'Definindo...' : 'Definir senha'}
            </Button>

            <Link
              href="/login"
              className="text-center text-xs text-ink/50 transition-colors hover:text-brand"
            >
              Já tenho acesso
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
