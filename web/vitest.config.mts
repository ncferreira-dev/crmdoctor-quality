import { defineConfig } from 'vitest/config';

// Executor de teste do front (item 32 do ENTREGA.md).
//
// Vitest e não Jest, e a razão é o ambiente: a `web/` é ESM e TypeScript puro,
// e o Vitest lê o mesmo tsconfig sem transpiler no meio. A API segue com Jest
// porque lá o NestJS já traz a configuração pronta; duas ferramentas aqui
// custam menos do que forçar uma só nos dois lugares.
//
// O fuso é fixado em UTC de propósito. É o oposto da máquina do Nícolas, e é
// exatamente onde o cálculo de dia civil quebrava antes do item 24: rodar o
// teste em America/Sao_Paulo esconderia o defeito que ele existe para pegar.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
