import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

// CNPJ, num lugar só: o que é guardado, o que é aceito e como se escreve.
//
// Num CRM de compliance o CNPJ é o identificador legal do cliente, e até aqui
// ele entrava como texto livre: `@IsOptional() @IsString()`. Qualquer coisa
// virava CNPJ, inclusive "não sei" e um número com um dígito trocado, que é o
// erro que ninguém percebe na hora e todo mundo descobre no dia de emitir
// documento.

/**
 * Só os dígitos. É o formato guardado no banco, e a razão é a unicidade: com
 * máscara, "12.345.678/0001-90" e "12345678000190" seriam duas empresas
 * diferentes para o índice único, e o mesmo cliente entraria duas vezes.
 */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Confere os dois dígitos verificadores. É o que separa "tem 14 números" de
 * "é um CNPJ": um dígito trocado passa no tamanho e morre aqui.
 */
export function cnpjValido(bruto: string): boolean {
  const digitos = apenasDigitos(bruto);
  if (digitos.length !== 14) return false;
  // Todos iguais passa na conta dos dígitos (11111111111111 fecha), e não é
  // CNPJ de ninguém. É o valor que aparece quando alguém quer preencher o campo
  // para seguir adiante.
  if (/^(\d)\1{13}$/.test(digitos)) return false;

  const calcular = (tamanho: number): number => {
    // Pesos 2..9 repetidos, da direita para a esquerda, como manda o cálculo.
    let soma = 0;
    let peso = 2;
    for (let i = tamanho - 1; i >= 0; i -= 1) {
      soma += Number(digitos[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return (
    calcular(12) === Number(digitos[12]) && calcular(13) === Number(digitos[13])
  );
}

/** 12345678000190 -> 12.345.678/0001-90. Para leitura, nunca para guardar. */
export function formatarCnpj(bruto: string): string {
  const d = apenasDigitos(bruto);
  if (d.length !== 14) return bruto;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Normaliza o CNPJ para dígitos antes de validar. Vem antes do @EhCnpj para a
 * tela poder mandar com máscara, com espaço, ou como a pessoa digitou.
 */
export const normalizarCnpj = Transform(({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const digitos = apenasDigitos(value);
  // Campo apagado vira undefined e não string vazia: '' passaria pelo
  // @IsOptional e gravaria vazio, que no índice único é um valor como outro
  // qualquer e impediria a segunda empresa sem CNPJ.
  return digitos === '' ? undefined : digitos;
});

export function EhCnpj(opcoes?: ValidationOptions) {
  return function (alvo: object, propriedade: string) {
    registerDecorator({
      name: 'ehCnpj',
      target: alvo.constructor,
      propertyName: propriedade,
      options: opcoes,
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' && cnpjValido(valor),
        defaultMessage: () =>
          'CNPJ inválido. Confira os 14 números antes de salvar.',
      },
    });
  };
}
