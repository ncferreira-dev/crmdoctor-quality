import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

// O que estes testes protegem: em 05/08/2026 dois membros entraram em produção
// com espaço no fim do nome ("Giovanna "), e o espaço apareceu em toda tela que
// mostra nome, incluindo o filtro de consultor da agenda e a carga do
// dashboard. Aparar no DTO cobre qualquer cliente, não só o formulário atual.
describe('CreateUserDto', () => {
  const base = {
    email: 'pessoa@teste.com',
    cargoId: '11111111-1111-4111-8111-111111111111',
  };

  it('apara espaço no começo e no fim do nome', () => {
    const dto = plainToInstance(CreateUserDto, {
      ...base,
      nome: '  Giovanna  ',
    });
    expect(dto.nome).toBe('Giovanna');
  });

  it('apara o e-mail, senão o login não encontra a conta depois', () => {
    const dto = plainToInstance(CreateUserDto, {
      ...base,
      nome: 'Erica',
      email: ' erica@teste.com ',
    });
    expect(dto.email).toBe('erica@teste.com');
  });

  it('apara telefone e especialidade', () => {
    const dto = plainToInstance(CreateUserDto, {
      ...base,
      nome: 'Aline',
      telefone: ' (11) 90000-0000 ',
      especialidade: ' Validação de processos ',
    });
    expect(dto.telefone).toBe('(11) 90000-0000');
    expect(dto.especialidade).toBe('Validação de processos');
  });

  it('nome só de espaços é recusado, e não vira nome vazio', async () => {
    const dto = plainToInstance(CreateUserDto, { ...base, nome: '     ' });
    const problemas = await validate(dto);
    expect(problemas.some((p) => p.property === 'nome')).toBe(true);
  });

  it('não estraga nome que já está limpo', () => {
    const dto = plainToInstance(CreateUserDto, {
      ...base,
      nome: 'Ana Paula Souza',
    });
    expect(dto.nome).toBe('Ana Paula Souza');
  });
});
