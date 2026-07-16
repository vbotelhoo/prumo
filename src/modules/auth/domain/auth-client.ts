import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "./auth";

// Client tipado para uso no browser (design.md, componente 5; AUTH-08,
// AUTH-12). `inferAdditionalFields<typeof auth>` deriva os campos de perfil
// (cpf, birthDate, endereço, termsAcceptedAt) direto da instância server de
// T3, sem repetir a lista aqui. Consumido por LoginForm/LogoutButton (T9).
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});
