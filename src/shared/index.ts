// API pública do kernel `shared`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste diretório. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).
//
// `shared` não contém regra de negócio de nenhum módulo de domínio e é
// importável por todos eles.

export { getEnv } from "./env";
export type { Env } from "./env";

export { prisma } from "./db";

export { addMoney, formatBRL, money, moneySchema, parseBRL, subtractMoney } from "./money";
export type { Money } from "./money";

export {
  parseDate,
  addMonths,
  getLastDayOfMonth,
  formatDateIso,
  isDateInRange,
} from "./date-utils";

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./components/ui/card";

export { Button, buttonVariants } from "./components/ui/button";
export { Checkbox } from "./components/ui/checkbox";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./components/ui/select";
export { Separator } from "./components/ui/separator";

export { Progress } from "./components/ui/progress";
export {
  RadioGroup,
  RadioGroupItem,
} from "./components/ui/radio-group";
