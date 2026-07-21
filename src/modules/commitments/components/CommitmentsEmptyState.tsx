"use client";

import { Card, CardContent } from "@/shared";

export function CommitmentsEmptyState() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <div className="space-y-3">
          <div className="text-4xl">📋</div>
          <h3 className="font-semibold text-lg">Nenhum compromisso ainda</h3>
          <p className="text-gray-500 text-sm max-w-xs mx-auto">
            Crie seu primeiro compromisso (compra parcelada ou financiamento) para começar a acompanhar suas parcelas.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
