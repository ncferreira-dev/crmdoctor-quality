-- Liga a visita ao projeto de compliance que ela executa.
--
-- Esta migration é ADITIVA: cria uma coluna anulável, uma chave estrangeira e
-- um índice. Não altera, não renomeia e não apaga nada, então não existe dado
-- que ela possa perder. Mesmo assim ela é escrita para ser segura de rodar
-- duas vezes (IF NOT EXISTS / DO block), porque o histórico deste projeto tem
-- um caso de container preso em loop por migration falha, e migration que não
-- pode ser repetida transforma qualquer susto em downtime.
--
-- Anulável de propósito: nem toda visita pertence a um projeto. Tornar isso
-- obrigatório exigiria inventar um projeto para as visitas que já existem.

ALTER TABLE "visitas" ADD COLUMN IF NOT EXISTS "projetoId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitas_projetoId_fkey'
  ) THEN
    ALTER TABLE "visitas"
      ADD CONSTRAINT "visitas_projetoId_fkey"
      FOREIGN KEY ("projetoId") REFERENCES "projetos"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "visitas_projetoId_idx" ON "visitas"("projetoId");
