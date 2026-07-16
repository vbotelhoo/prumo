import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/modules/auth";

// Rota catch-all do handler Better Auth (design.md, componente 3):
// composição pura, sem lógica própria.
export const { GET, POST } = toNextJsHandler(auth);
