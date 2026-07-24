import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared";

// Página `/terms` (design.md, componente 7; spec.md, story "Página de
// termos" AC1, AUTH-13): pública (sem verificação de sessão), conteúdo
// placeholder claramente identificado como tal — o conteúdo jurídico real
// é responsabilidade do mantenedor (fora de escopo, spec.md "Out of
// Scope").
export default function TermsPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Termos de uso</CardTitle>
          <CardDescription>Conteúdo placeholder</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            Este é um texto placeholder para os termos de uso do Prumo. O
            conteúdo jurídico definitivo ainda não foi redigido e será
            adicionado em uma etapa futura — nada nesta página deve ser
            interpretado como os termos reais do produto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
