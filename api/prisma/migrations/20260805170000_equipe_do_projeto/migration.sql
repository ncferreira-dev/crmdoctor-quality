-- Equipe do projeto: quem toca cada projeto.
--
-- Esta migration é ADITIVA: cria uma tabela de ligação nova e mais nada. Não
-- altera, não renomeia e não apaga coluna nem tabela existente, então não há
-- dado que ela possa perder. Contagem antes de escrever, na produção:
-- 6 projetos, 7 usuários, e nenhuma linha de equipe (a tabela não existia).
--
-- Escrita para ser segura de rodar duas vezes (IF NOT EXISTS), porque o
-- histórico deste projeto tem um caso de container preso em laço por migration
-- falha, e migration que não pode ser repetida transforma qualquer susto em
-- downtime.
--
-- O nome vem da relação `@relation("EquipeDoProjeto")` no schema, e não do par
-- de models, para quem abrir o banco entender do que se trata sem ler o Prisma.

CREATE TABLE IF NOT EXISTS "_EquipeDoProjeto" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Índice único no par: a mesma pessoa não entra duas vezes na mesma equipe.
CREATE UNIQUE INDEX IF NOT EXISTS "_EquipeDoProjeto_AB_unique"
    ON "_EquipeDoProjeto"("A", "B");

-- Índice em B: a consulta "em quais projetos esta pessoa está" é tão comum
-- quanto "quem está neste projeto", e sem ele a segunda varre a tabela toda.
CREATE INDEX IF NOT EXISTS "_EquipeDoProjeto_B_index"
    ON "_EquipeDoProjeto"("B");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_EquipeDoProjeto_A_fkey'
  ) THEN
    ALTER TABLE "_EquipeDoProjeto"
      ADD CONSTRAINT "_EquipeDoProjeto_A_fkey"
      FOREIGN KEY ("A") REFERENCES "projetos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = '_EquipeDoProjeto_B_fkey'
  ) THEN
    ALTER TABLE "_EquipeDoProjeto"
      ADD CONSTRAINT "_EquipeDoProjeto_B_fkey"
      FOREIGN KEY ("B") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
