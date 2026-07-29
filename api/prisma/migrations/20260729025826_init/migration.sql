-- CreateEnum
CREATE TYPE "Segmento" AS ENUM ('FARMA', 'COSMETICOS', 'HOSPITALAR', 'LOGISTICA', 'LABORATORIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EstagioLead" AS ENUM ('NOVO', 'CONTATO_FEITO', 'QUALIFICADO', 'PROPOSTA', 'GANHO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "EstagioProjeto" AS ENUM ('DIAGNOSTICO', 'PROPOSTA', 'EXECUCAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "TipoInteracao" AS ENUM ('LIGACAO', 'EMAIL', 'REUNIAO', 'WHATSAPP', 'VISITA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusTicket" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'AGUARDANDO_CLIENTE', 'RESOLVIDO');

-- CreateEnum
CREATE TYPE "StatusVisita" AS ENUM ('AGENDADA', 'CONFIRMADA', 'REALIZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "cargos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "nivel" INTEGER NOT NULL,
    "permissoes" TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "cargoId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "empresaNome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "segmento" "Segmento",
    "origem" TEXT,
    "estagio" "EstagioLead" NOT NULL DEFAULT 'NOVO',
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "empresas_clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "segmento" "Segmento" NOT NULL,
    "contatoNome" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "leadOrigemId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "estagio" "EstagioProjeto" NOT NULL DEFAULT 'DIAGNOSTICO',
    "dataLimiteCompliance" DATE,
    "valor" DECIMAL(12,2),
    "empresaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interacoes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoInteracao" NOT NULL,
    "resumo" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT,
    "empresaId" TEXT,
    "projetoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "status" "StatusTicket" NOT NULL DEFAULT 'ABERTO',
    "prioridade" INTEGER NOT NULL DEFAULT 2,
    "empresaId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultores" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "especialidade" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitas" (
    "id" TEXT NOT NULL,
    "consultorId" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ(3) NOT NULL,
    "fim" TIMESTAMPTZ(3) NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "status" "StatusVisita" NOT NULL DEFAULT 'AGENDADA',
    "documentoUrl" TEXT,
    "observacoes" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'COMPLIANCE_PRAZO',
    "mensagem" TEXT NOT NULL,
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "projetoId" TEXT,
    "dataReferencia" DATE,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cargos_nome_key" ON "cargos"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "leads_estagio_idx" ON "leads"("estagio");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_clientes_cnpj_key" ON "empresas_clientes"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "empresas_clientes_leadOrigemId_key" ON "empresas_clientes"("leadOrigemId");

-- CreateIndex
CREATE INDEX "projetos_estagio_idx" ON "projetos"("estagio");

-- CreateIndex
CREATE INDEX "projetos_dataLimiteCompliance_idx" ON "projetos"("dataLimiteCompliance");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "visitas_consultorId_inicio_idx" ON "visitas"("consultorId", "inicio");

-- CreateIndex
CREATE INDEX "visitas_empresaId_inicio_idx" ON "visitas"("empresaId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "notificacoes_projetoId_tipo_dataReferencia_key" ON "notificacoes"("projetoId", "tipo", "dataReferencia");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "empresas_clientes" ADD CONSTRAINT "empresas_clientes_leadOrigemId_fkey" FOREIGN KEY ("leadOrigemId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interacoes" ADD CONSTRAINT "interacoes_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_consultorId_fkey" FOREIGN KEY ("consultorId") REFERENCES "consultores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitas" ADD CONSTRAINT "visitas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
