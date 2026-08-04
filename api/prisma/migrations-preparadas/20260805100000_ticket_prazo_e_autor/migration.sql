-- ESCRITA E NÃO APLICADA. Ver LEIA-ANTES-DE-RODAR.md nesta pasta.
--
-- Dá ao ticket as duas coisas que a tela precisa dizer e o modelo não tem.
--
-- 1. prazoResposta: hoje o prazo é DERIVADO da prioridade, com a tabela fixa em
--    tickets.constants (alta 2h, média 8h, baixa 24h). Isso funciona enquanto
--    todo cliente tiver o mesmo SLA. No dia em que um contrato prometer prazo
--    diferente, não há onde guardar. A coluna é anulável de propósito: nulo
--    significa "usa o prazo da prioridade", que é o comportamento de hoje, e
--    nada muda para os tickets que já existem.
--
-- 2. abertoPor: quem pediu o chamado do lado do cliente. Não confundir com
--    criadoPorId, que a auditoria já preenche e diz quem digitou no CRM. São
--    pessoas diferentes: o cliente liga, alguém da Doctor Quality registra.
--    Texto livre e não FK para EmpresaCliente.contatoNome, porque quem abre
--    nem sempre é o contato principal cadastrado.
--
-- ANTES DE RODAR, conte em produção:
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE "excluidoEm" IS NOT NULL) AS soft_deletados
--   FROM tickets;
--
-- No schema.prisma, no model Ticket:
--   prazoResposta  DateTime?
--   abertoPor      String?

-- Trava: a migration é aditiva, então o único estado que a impede é a coluna
-- já existir com outro tipo, o que significaria que alguém aplicou uma versão
-- diferente disto à mão. Melhor abortar do que divergir em silêncio.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tickets'
      AND column_name = 'prazoResposta'
      AND data_type <> 'timestamp without time zone'
  ) THEN
    RAISE EXCEPTION 'tickets.prazoResposta já existe com outro tipo. Confira o estado do banco antes de seguir.';
  END IF;
END $$;

ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "prazoResposta" TIMESTAMP(3);
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "abertoPor" TEXT;

-- O índice serve à fila de atendimento: "o que vence primeiro" é a pergunta
-- que a tela de tickets vai fazer o tempo todo.
CREATE INDEX IF NOT EXISTS "tickets_prazoResposta_idx" ON "tickets"("prazoResposta");
