-- Item 9 do ENTREGA.md: separar cenário de demonstração de trabalho de cliente.
--
-- Aditiva e com default: nenhuma linha existente muda de significado ao aplicar,
-- e todo mundo nasce como real. Quem é demonstração é marcado depois, por
-- script, contra a lista de ids levantada em docs/demo-producao-ids.json.
--
-- Interacao tem coluna própria porque duas interações de demonstração da
-- produção estão em empresas reais: herdar do pai deixaria as duas passando.

ALTER TABLE "empresas_clientes" ADD COLUMN "demonstracao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projetos" ADD COLUMN "demonstracao" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "interacoes" ADD COLUMN "demonstracao" BOOLEAN NOT NULL DEFAULT false;

-- Índices parciais: toda consulta do produto passa a filtrar por
-- demonstracao = false, e é essa a linha que precisa ser rápida.
CREATE INDEX "empresas_clientes_demonstracao_idx" ON "empresas_clientes" ("demonstracao");
CREATE INDEX "projetos_demonstracao_idx" ON "projetos" ("demonstracao");
