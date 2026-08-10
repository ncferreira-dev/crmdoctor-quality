import { apenasDigitos, cnpjValido, formatarCnpj } from './cnpj';

// CNPJs reais de empresas públicas, escolhidos por serem verificáveis por
// qualquer um: Petrobras e Banco do Brasil.
const PETROBRAS = '33000167000101';
const BANCO_DO_BRASIL = '00000000000191';

describe('cnpjValido', () => {
  it('aceita CNPJ com dígito verificador correto, com e sem máscara', () => {
    expect(cnpjValido(PETROBRAS)).toBe(true);
    expect(cnpjValido('33.000.167/0001-01')).toBe(true);
    expect(cnpjValido(BANCO_DO_BRASIL)).toBe(true);
  });

  // É o erro que ninguém percebe na hora e todo mundo descobre no dia de
  // emitir documento: tamanho certo, dígito errado.
  it('recusa um dígito trocado', () => {
    expect(cnpjValido('33000167000102')).toBe(false);
    expect(cnpjValido('33000167000111')).toBe(false);
  });

  it('recusa tamanho errado', () => {
    expect(cnpjValido('3300016700010')).toBe(false);
    expect(cnpjValido('330001670001010')).toBe(false);
    expect(cnpjValido('')).toBe(false);
  });

  // Passa na conta dos dígitos e não é CNPJ de ninguém. É o que aparece quando
  // alguém quer preencher o campo para seguir adiante.
  it('recusa todos os dígitos iguais', () => {
    expect(cnpjValido('11111111111111')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });
});

describe('apenasDigitos e formatarCnpj', () => {
  it('guarda sem máscara e mostra com máscara', () => {
    expect(apenasDigitos('33.000.167/0001-01')).toBe(PETROBRAS);
    expect(formatarCnpj(PETROBRAS)).toBe('33.000.167/0001-01');
  });

  it('não inventa máscara em texto que não é CNPJ', () => {
    expect(formatarCnpj('123')).toBe('123');
  });
});
