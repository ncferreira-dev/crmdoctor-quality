'use client';

import { FormEvent, useId, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { salvarSessao } from '../../../lib/auth';
import { Usuario } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { MarcaAnel } from '../../../components/ui/MarcaAnel';

interface LoginResponse {
  accessToken: string;
  user: Usuario;
}

export default function LoginPage() {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const { accessToken, user } = await api.post<LoginResponse>('/auth/login', { email, senha });
      salvarSessao(accessToken, user);
      router.push('/dashboard');
    } catch (e) {
      // A API responde 429 quando estoura o limite de tentativas. Dizer isso em
      // vez de "senha inválida" evita que a pessoa continue tentando à toa.
      const mensagem = e instanceof Error ? e.message : '';
      setErro(
        /429|muitas|many/i.test(mensagem)
          ? 'Muitas tentativas seguidas. Espere um minuto e tente de novo.'
          : 'E-mail ou senha inválidos',
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4 py-10">
      <div className="w-full max-w-sm rounded-card bg-white p-8 shadow-overlay">
        <div className="flex flex-col items-center gap-3">
          <MarcaAnel />
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="titulo-pagina">Doctor Quality</h1>
            <p className="text-[10px] font-light uppercase tracking-[0.18em] text-ink/40">
              Compliance
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
          <Input
            id={`${id}-email`}
            label="E-mail"
            type="email"
            autoComplete="email"
            placeholder="voce@doctorquality.com.br"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            id={`${id}-senha`}
            label="Senha"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && (
            <p role="alert" className="text-sm text-accent">
              {erro}
            </p>
          )}

          <Button type="submit" disabled={carregando} className="mt-1 w-full">
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <div className="mt-6 flex items-center gap-3 before:h-px before:flex-1 before:bg-ink/10 after:h-px after:flex-1 after:bg-ink/10">
          <span className="text-[10px] font-light uppercase tracking-[0.18em] text-ink/40">ou</span>
        </div>

        <Link
          href="/primeiro-acesso"
          className="mt-6 flex w-full items-center justify-center rounded-md border border-ink/15 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
        >
          Tenho um código de acesso
        </Link>

        <p className="mt-6 text-center text-xs leading-relaxed text-ink/45">
          Esqueceu a senha? Peça um novo código de acesso a quem administra o sistema.
        </p>
      </div>
    </div>
  );
}
