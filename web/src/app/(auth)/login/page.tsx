'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { salvarSessao } from '../../../lib/auth';
import { Usuario } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';

interface LoginResponse {
  accessToken: string;
  user: Usuario;
}

export default function LoginPage() {
  const router = useRouter();
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
    } catch {
      setErro('E-mail ou senha inválidos');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-night px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card bg-white p-8 shadow-overlay"
      >
        <h1 className="titulo-pagina">Doctor Quality</h1>
        <p className="mb-6 mt-1.5 text-[10px] font-light uppercase tracking-[0.18em] text-ink/40">
          Compliance
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          {erro && (
            <p role="alert" className="text-sm text-accent">
              {erro}
            </p>
          )}

          <Button type="submit" disabled={carregando} className="mt-2 w-full">
            {carregando ? 'Entrando...' : 'Entrar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
