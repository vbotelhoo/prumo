import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared";

// Placeholder estático (SETUP-03): nenhum import de banco/auth — garante o
// edge case "home renderiza mesmo com o banco fora do ar" (spec.md, Edge
// Cases). Conteúdo (nome, tagline, significado) extraído de PROJECT.md.
export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6 py-16">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold">Prumo</CardTitle>
          <CardDescription className="text-base">
            Sua vida financeira alinhada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">
            &ldquo;Prumo&rdquo; vem do instrumento usado na construção civil
            para verificar o alinhamento vertical perfeito — e da expressão
            popular &ldquo;estar no prumo&rdquo;: estar em ordem, alinhado,
            equilibrado. O nome traduz a promessa do produto: tirar a vida
            financeira do improviso e colocá-la no prumo, com cada
            compromisso futuro visível e sob controle.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
