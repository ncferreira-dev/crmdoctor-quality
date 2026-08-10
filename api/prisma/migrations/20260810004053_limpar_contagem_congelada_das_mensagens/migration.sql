-- Tira a contagem de dias das mensagens gravadas antes de 09/08/2026.
--
-- Ate aqui o cron escrevia a frase inteira no banco, incluindo "vence em N
-- dias". O texto era gravado uma vez e o @@unique impedia regravar, entao o
-- numero congelava: em 09/08/2026 o dashboard anunciava "vence em 9 dias" ao
-- lado de uma data em que faltavam 4, enquanto a tela do projeto, que sempre
-- calculou na hora, dizia 4. Duas telas do mesmo sistema discordando do mesmo
-- prazo.
--
-- A mensagem passou a guardar so o fato, e quem conta os dias e a tela, a
-- partir de dataReferencia. Esta migration alinha as linhas antigas com essa
-- regra, senao elas apareceriam com a contagem duas vezes: a congelada dentro
-- do texto e a calculada ao lado.
--
-- E uma limpeza de dado, nao de estrutura: nao cria, nao apaga e nao renomeia
-- coluna nenhuma. Toca somente as linhas cujo texto termina no padrao antigo,
-- e o WHERE garante que rodar duas vezes nao muda nada na segunda.

UPDATE "notificacoes"
SET "mensagem" = regexp_replace("mensagem", ' vence em -?[0-9]+ dias?$', '')
WHERE "mensagem" ~ ' vence em -?[0-9]+ dias?$';
