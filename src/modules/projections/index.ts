// API pública do módulo `projections`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste módulo. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).
//
// Hoje vazio — placeholder criado no setup; `projections` é somente-leitura
// sobre `transactions`/`commitments` (nunca escreve dados deles) e não é
// importado por nenhum outro módulo. Exports públicos chegam na feature
// `projections` (previsibilidade mensal) do roadmap.
