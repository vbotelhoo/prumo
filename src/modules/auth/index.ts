// API pública do módulo `auth`.
// Este é o único ponto de entrada permitido para outros módulos/camadas
// importarem código deste módulo. Nada fora deste arquivo deve ser
// importado diretamente (reforçado por eslint-plugin-boundaries).

export { auth } from "./domain/auth";

// Server actions (design.md, componente 4): fronteira HTTP do módulo,
// consumidas pelas páginas de `src/app` (T10) e pelos componentes de UI.
export { signUpAction } from "./actions/sign-up";
export type { SignUpActionResult } from "./actions/sign-up";
export { signInAction } from "./actions/sign-in";
export type { SignInActionResult } from "./actions/sign-in";
export { signOutAction } from "./actions/sign-out";
export { lookupCepAction } from "./actions/lookup-cep";

// Componentes de UI (design.md, componente 6): formulários e botão prontos
// para composição nas páginas de `src/app`.
export { SignUpForm } from "./components/sign-up-form";
export { LoginForm } from "./components/login-form";
export { LogoutButton } from "./components/logout-button";
