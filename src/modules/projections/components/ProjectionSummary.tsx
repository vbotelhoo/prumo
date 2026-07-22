import { Card, formatBRL, money } from "@/shared";
import type { MonthlyProjection } from "../domain/types";

export function ProjectionSummary({ projection }: { projection: MonthlyProjection }) {
  const isSaldoNegativo = projection.saldoProjetado < 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="text-sm text-gray-500 mb-2">Entradas Previstas</div>
        <div className="text-lg font-semibold text-green-600">
          {formatBRL(projection.entradasPrevistas)}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm text-gray-500 mb-2">Saídas Previstas</div>
        <div className="text-lg font-semibold text-red-600">
          {formatBRL(projection.saidasPrevistas)}
        </div>
      </Card>

      <Card className={`p-4 ${isSaldoNegativo ? "border-red-200" : ""}`}>
        <div className="text-sm text-gray-500 mb-2">Saldo Projetado</div>
        <div
          className={`text-lg font-semibold ${
            isSaldoNegativo ? "text-destructive" : "text-green-600"
          }`}
        >
          {isSaldoNegativo ? "-" : ""}
          {formatBRL(money(Math.abs(projection.saldoProjetado)))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm text-gray-500 mb-2">Total Comprometido</div>
        <div className="text-lg font-semibold text-blue-600">
          {formatBRL(projection.totalComprometido)}
        </div>
      </Card>
    </div>
  );
}
