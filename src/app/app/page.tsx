import { headers } from "next/headers";
import Link from "next/link";

import { auth, LogoutButton } from "@/modules/auth";
import { Button } from "@/shared";

export default async function AppPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const name = session?.user.name ?? "";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div className="text-center">
          <p className="text-2xl">
            Olá, <span className="font-semibold">{name}</span>!
          </p>
          <p className="text-gray-500 mt-2">Bem-vindo ao Prumo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/app/transactions" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">💰</span>
              <span>Transações</span>
            </Button>
          </Link>
          <Link href="/app/commitments" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">📋</span>
              <span>Compromissos</span>
            </Button>
          </Link>
          <Link href="/app/categories" className="block">
            <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2">
              <span className="text-2xl">🏷️</span>
              <span>Categorias</span>
            </Button>
          </Link>
        </div>

        <div className="flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
