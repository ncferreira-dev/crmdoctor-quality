-- Codigo de convite deixa de ser guardado em texto puro.
--
-- O QUE ERA. A coluna users.codigoConvite guardava os 8 digitos em claro, com
-- indice unico. Quem lesse a tabela, ou o arquivo de backup que sai dela,
-- pegava o codigo de uma conta pendente, definia a senha e entrava. Era uma
-- senha de uso unico escrita a vista, na mesma linha do hash da senha de
-- verdade. No retrato da producao de 07/08/2026 havia 4 codigos assim.
--
-- O QUE FICA. Uma coluna nova, codigoConviteHash, com argon2, o mesmo
-- algoritmo do senhaHash. Como argon2 e salgado, nao existe busca pelo hash:
-- por isso o resgate passou a pedir e-mail mais codigo. Ver
-- UsersService.resgatarConvite.
--
-- ESTA MIGRATION E DESTRUTIVA, e o efeito precisa estar escrito.
--
-- Nao da para converter os codigos existentes: hash se calcula em codigo, nao
-- em SQL, e rodar um script entre duas migrations dentro do boot do container
-- e frageil. Entao **todo convite pendente e invalidado aqui**. Quem ainda nao
-- fez o primeiro acesso precisa de um codigo novo, e o caminho e a tela de
-- Membros, botao "Gerar codigo" (ou "Resetar senha", para quem ja tinha
-- senha). Sao 30 segundos por pessoa.
--
-- Em producao isso atinge 4 contas, todas @teste.com, todas com convite
-- pendente que ninguem resgatou em 5 dias, e todas na fila do item 8 do
-- ENTREGA.md para serem desativadas. Nenhuma conta com senha ja definida e
-- afetada: essas tem codigoConvite nulo e continuam entrando normalmente.
--
-- ANTES DE RODAR EM PRODUCAO: backup, e a contagem abaixo conferida.
--   SELECT count(*) FILTER (WHERE "codigoConvite" IS NOT NULL) AS pendentes,
--          count(*) AS total
--   FROM users;

-- AddColumn
ALTER TABLE "users" ADD COLUMN "codigoConviteHash" TEXT;

-- DropIndex
DROP INDEX IF EXISTS "users_codigoConvite_key";

-- DropColumn
ALTER TABLE "users" DROP COLUMN "codigoConvite";
