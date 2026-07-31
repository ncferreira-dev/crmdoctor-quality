// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Faz a regra "proibido any" do CLAUDE.md ser cumprida pela ferramenta.
      // Promise solta vira erro: num app com cron de compliance, um await
      // esquecido é alerta que não dispara e ninguém percebe.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // Prefixo _ marca descarte intencional (ex.: tirar senhaHash da resposta
      // com `const { senhaHash: _senhaHash, ...resto } = user`).
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Os unsafe-* ficam em warn de propósito: o recommendedTypeChecked
      // inundaria de erro código que já convive com tipos do Prisma/decorators.
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
