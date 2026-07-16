// API pública do módulo `auth`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste módulo. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).

export { auth } from "./domain/auth";
