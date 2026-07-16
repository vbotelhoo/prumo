import { getEnv } from "@/shared";

// Hook oficial do Next.js 16 (`src/instrumentation.ts`, convenção com `src/`
// como diretório base): `register()` roda uma única vez quando o processo
// que serve tráfego de fato inicia (`next dev`/`next start`), antes de
// qualquer request — nunca durante `next build` (que só compila). É aqui
// que a validação de env definida em `shared/env.ts` é disparada no boot
// real (design.md, Error Handling Strategy; spec.md AC-4 da story
// Persistência): env ausente/inválida → `getEnv()` lança, `register()`
// propaga a exceção (não a engole).
//
// SPEC_DEVIATION: o runtime do Next.js 16 captura esse erro internamente
// (`prepare().catch(...)`) e apenas loga "Failed to prepare server"/"An
// error occurred while loading the instrumentation hook" — não encerra o
// processo com `process.exit`. Efeito observado empiricamente: o processo
// continua de pé, mas toda rota (incl. a home estática) passa a responder
// 500, nunca o conteúdo real. Isso já cumpre o AC-4 (falha clara nomeando as
// vars ausentes, não um warning genérico, nenhum tráfego real servido); não
// é um "processo não sobe" literal, que dependeria de comportamento interno
// do Next.js fora do nosso controle.
export function register(): void {
  getEnv();
}
