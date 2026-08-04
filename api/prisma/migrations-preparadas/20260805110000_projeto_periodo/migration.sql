-- ESCRITA E NÃO APLICADA. Ver LEIA-ANTES-DE-RODAR.md nesta pasta.
--
-- Dá começo e fim previsto ao projeto.
--
-- Hoje o Projeto tem só dataLimiteCompliance, que é o prazo REGULATÓRIO, a data
-- em que o órgão cobra. Não existe registro de quando o trabalho começou nem de
-- quando a consultoria esperava terminar. Duas consequências práticas:
--
--   Ninguém consegue dizer há quanto tempo um projeto se arrasta. "Em execução"
--   há três semanas e há oito meses são a mesma frase na tela.
--
--   O prazo de compliance vira o único marco, então tudo parece no prazo até o
--   mês em que deixa de estar.
--
-- Os dois campos são data civil (@db.Date), como dataLimiteCompliance, e
-- anuláveis: os projetos que já existem não têm essa informação e ninguém vai
-- inventá-la retroativamente.
--
-- terminoEsperado é diferente de dataLimiteCompliance de propósito. O primeiro é
-- a promessa da consultoria; o segundo é a exigência do órgão. Normalmente o
-- primeiro vem antes, e a distância entre os dois é a folga que a equipe tem.
--
-- ANTES DE RODAR, conte em produção:
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE "excluidoEm" IS NOT NULL) AS soft_deletados
--   FROM projetos;
--
-- No schema.prisma, no model Projeto:
--   dataInicio       DateTime? @db.Date
--   terminoEsperado  DateTime? @db.Date
--
-- E na tela: o formulário de projeto ganha os dois campos, e o detalhe passa a
-- mostrar "em execução há N dias". Lembrar de usar formatarDataCivil, não
-- formatarData: campo @db.Date renderizado com fuso mostra o dia anterior.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projetos'
      AND column_name IN ('dataInicio', 'terminoEsperado')
      AND data_type <> 'date'
  ) THEN
    RAISE EXCEPTION 'projetos já tem dataInicio ou terminoEsperado com outro tipo. Confira o estado do banco antes de seguir.';
  END IF;
END $$;

ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "dataInicio" DATE;
ALTER TABLE "projetos" ADD COLUMN IF NOT EXISTS "terminoEsperado" DATE;

-- Projeto atrasado em relação à própria promessa é a consulta que justifica o
-- índice: terminoEsperado no passado com estágio diferente de CONCLUIDO.
CREATE INDEX IF NOT EXISTS "projetos_terminoEsperado_idx" ON "projetos"("terminoEsperado");
