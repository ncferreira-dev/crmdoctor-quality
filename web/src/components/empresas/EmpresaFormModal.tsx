'use client';

import { FormEvent, useState } from 'react';
import { api } from '../../lib/api';
import { EmpresaCliente, Segmento } from '../../types';
import { SEGMENTO_LABEL, formatarCnpj, mascararCnpj } from '../../lib/formato';
import {
  ErrosForm,
  focarPrimeiroErro,
  temErro,
  validarObrigatorios,
} from '../../lib/formulario';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';

const SEGMENTOS = Object.keys(SEGMENTO_LABEL) as Segmento[];

interface EmpresaFormModalProps {
  aberto: boolean;
  empresa?: EmpresaCliente | null;
  onFechar: () => void;
  onSalvo: (empresa: EmpresaCliente) => void;
}

export function EmpresaFormModal({ aberto, empresa, onFechar, onSalvo }: EmpresaFormModalProps) {
  const editando = Boolean(empresa);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<ErrosForm>({});
  // Nasce com a máscara aplicada: o que vem da API é só dígito.
  const [cnpj, setCnpj] = useState(() => formatarCnpj(empresa?.cnpj));

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const form = new FormData(evento.currentTarget);

    const problemas = validarObrigatorios(form, { nome: 'Informe o nome da empresa.' });
    if (temErro(problemas)) {
      setErros(problemas);
      focarPrimeiroErro(problemas);
      return;
    }
    setErros({});

    const corpo = {
      nome: String(form.get('nome')),
      segmento: String(form.get('segmento')) as Segmento,
      cnpj: String(form.get('cnpj')) || undefined,
      contatoNome: String(form.get('contatoNome')) || undefined,
      email: String(form.get('email')) || undefined,
      telefone: String(form.get('telefone')) || undefined,
    };

    setSalvando(true);
    setErro(null);
    try {
      const salva = empresa
        ? await api.patch<EmpresaCliente>(`/empresas/${empresa.id}`, corpo)
        : await api.post<EmpresaCliente>('/empresas', corpo);
      onSalvo(salva);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar empresa' : 'Nova empresa'} onFechar={onFechar}>
      <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
        <Input
          id="nome"
          name="nome"
          label="Nome"
          defaultValue={empresa?.nome ?? ''}
          erro={erros.nome}
        />
        <Select id="segmento" name="segmento" label="Segmento" defaultValue={empresa?.segmento ?? 'FARMA'}>
          {SEGMENTOS.map((s) => (
            <option key={s} value={s}>
              {SEGMENTO_LABEL[s]}
            </option>
          ))}
        </Select>
        {/* Máscara na digitação, e o valor sai daqui como a pessoa vê. Quem
            normaliza para 14 dígitos é a API, porque o formulário é cliente e
            cliente não é para confiar: guardar com máscara faria o mesmo CNPJ
            entrar duas vezes no índice único. */}
        <Input
          id="cnpj"
          name="cnpj"
          label="CNPJ"
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          value={cnpj}
          onChange={(evento) => setCnpj(mascararCnpj(evento.target.value))}
          erro={erros.cnpj}
        />
        <Input id="contatoNome" name="contatoNome" label="Contato" defaultValue={empresa?.contatoNome ?? ''} />
        <Input id="email" name="email" label="E-mail" type="email" defaultValue={empresa?.email ?? ''} />
        <Input id="telefone" name="telefone" label="Telefone" defaultValue={empresa?.telefone ?? ''} />

        {erro && <p className="text-xs text-accent">{erro}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variante="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
