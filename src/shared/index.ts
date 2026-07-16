// API pública do kernel `shared`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste diretório. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).
//
// `shared` não contém regra de negócio de nenhum módulo de domínio e é
// importável por todos eles.

export { getEnv } from "./env";
export type { Env } from "./env";

export { addMoney, formatBRL, money, moneySchema, subtractMoney } from "./money";
export type { Money } from "./money";

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
