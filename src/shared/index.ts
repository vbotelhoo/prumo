// API pública do kernel `shared`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste diretório. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).
//
// Hoje vazio — o tipo `Money`, validação de env e demais utilitários
// chegam em tasks futuras (Fase 2). `shared` não contém regra de negócio
// de nenhum módulo de domínio e é importável por todos eles.
