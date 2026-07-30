import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build enxuto para container (EasyPanel): copia só o necessário pra rodar,
  // sem o node_modules inteiro.
  output: "standalone",
};

export default nextConfig;
