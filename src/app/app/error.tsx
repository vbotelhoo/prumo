"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/shared";

interface AppErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

// Boundary compartilhado de /app (POLISH-02, spec.md P1 Fundação AC2):
// Next.js propaga qualquer erro não tratado das sub-rotas (dashboard,
// transações, compromissos, categorias, projeções) até aqui — um boundary
// bem feito evita 5 cópias. Mensagem pt-BR calma, sem stack trace nem
// jargão técnico na UI; o erro original só vai para o console do
// navegador (log de diagnóstico, nunca exibido ao usuário).
export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="font-heading text-lg font-medium text-foreground">
        Algo não saiu como esperado
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Não conseguimos carregar esta página agora. Tente novamente em instantes.
      </p>
      <Button type="button" onClick={() => reset()} className="mt-2">
        Tentar novamente
      </Button>
    </div>
  );
}
