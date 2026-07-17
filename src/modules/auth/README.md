# Módulo `auth`

## Responsabilidade

Identidade e sessão do usuário: cadastro, login/logout, e gestão de sessão via Better Auth (e-mail/senha no MVP). Todo dado das demais features é escopado ao usuário autenticado por este módulo (AD-012).

## API pública

- `auth` — instância Better Auth (`betterAuth`) configurada com `prismaAdapter` (PostgreSQL), `emailAndPassword` (min. 8 caracteres) e `user.additionalFields` para o perfil cadastral (CPF, nascimento, endereço, `termsAcceptedAt`). Consumida pela rota catch-all `src/app/api/auth/[...all]/route.ts` (`toNextJsHandler(auth)`) e por `auth.api.getSession` nas páginas/layout de `src/app/app` e `src/app/{signup,login}` (autoridade real de sessão).
- `signUpAction(input): Promise<SignUpActionResult>` — server action de cadastro: valida com Zod (nome, nascimento, CPF, endereço, e-mail, senha, confirmação, aceite de termos), cria a conta via `auth.api.signUpEmail` e inicia sessão. Falha de e-mail/CPF duplicado ou validação retorna o mesmo erro genérico (`{ ok: false, error, fieldErrors? }`), sem indicar o campo causador.
- `signInAction(input): Promise<SignInActionResult>` — server action de login: e-mail + senha; credenciais inválidas retornam mensagem genérica (`GENERIC_LOGIN_ERROR`), sem distinguir e-mail inexistente de senha errada.
- `signOutAction(): Promise<never>` — server action de logout: destrói a sessão no servidor e redireciona para `/`.
- `lookupCepAction(cep): Promise<LookupCepResult>` — consulta ViaCEP com fail-open (`found` | `not_found` | `unavailable`); nunca lança nem bloqueia o cadastro.
- `SignUpForm` — formulário de cadastro completo (pt-BR), com preenchimento automático de endereço via CEP e exibição de erros de campo/genéricos.
- `LoginForm` — formulário de login (e-mail + senha) com mensagem genérica de erro.
- `LogoutButton` — botão que encerra a sessão (via `signOutAction`) e navega para `/`.

Consumidores esperados: páginas de `src/app` (`/signup`, `/login`, `/app`) compõem os componentes e chamam `auth.api.getSession` para proteger rotas; os demais módulos de domínio (`categories`, `transactions`, `commitments`, `projections`) usam `auth` para resolver o usuário autenticado que escopa seus dados (AD-012).

## Dependências permitidas

Segue o grafo de fronteiras (AD-010, reforçado por `eslint-plugin-boundaries`):

- **Pode importar**: `shared` (via `src/shared`'s `index.ts`).
- **É importável por**: `categories`, `transactions`, `commitments`, `projections` (todos os demais módulos de domínio), e por `src/app` (camada de composição), sempre através deste `index.ts`.
- Import de arquivos internos deste módulo (`domain/`, `data/`, `services/`, `actions/`, `components/`) por qualquer código fora dele é uma violação de fronteira.
