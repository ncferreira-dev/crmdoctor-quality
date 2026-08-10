import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build enxuto para container (EasyPanel): copia só o necessário pra rodar,
  // sem o node_modules inteiro.
  output: "standalone",

  // A raiz do projeto é ESTA pasta, e é dito à mão de propósito. Sem esta
  // linha o Turbopack descobre a raiz sozinho, subindo o disco até achar um
  // lockfile, e elege a primeira pasta que tiver um. Em 08/08/2026 o Opensquad
  // criou um package-lock.json em /Users/nicolas: a raiz virou a pasta do
  // usuário, o proxy.ts parou de ser carregado e TODA página autenticada
  // passou a responder 404, com o servidor subindo normal e sem erro na tela.
  // Ficou assim por dois dias sem ninguém perceber. Qualquer lockfile que
  // apareça acima desta pasta repetiria o problema, e não há como impedir que
  // apareça: o conserto é não deixar a descoberta acontecer.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
