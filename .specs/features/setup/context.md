# Setup Context

**Gathered:** 2026-07-16
**Spec:** `.specs/features/setup/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Fundação técnica completa do Prumo: projeto Next.js 15+ (App Router, TypeScript) com estrutura de monolito modular, Prisma + PostgreSQL, Better Auth configurado (sem UI), lint de fronteiras de módulos, suítes de teste (Vitest unit/integração + Playwright), CI no GitHub Actions, documentação obrigatória e deploy inicial no Railway. Nenhuma feature de negócio (auth UI, transações etc.) faz parte desta feature.

---

## Implementation Decisions

### Gerenciador de pacotes

- pnpm — lockfile `pnpm-lock.yaml`, usado no CI e no build do Railway.

### PostgreSQL para testes de integração (local)

- Testcontainers: a suíte de integração sobe e derruba um PostgreSQL descartável via Docker automaticamente. Nenhum passo manual para o dev.
- No CI permanece o service container (AD-011) — a suíte deve funcionar nos dois modos (ex.: usando `DATABASE_URL` quando fornecida, Testcontainers caso contrário).

### Profundidade do Better Auth no setup

- Instalar E configurar: schema Prisma do Better Auth gerado e migrado, handler de rota (`/api/auth/[...all]`) funcional, instância do client/server criada no módulo `auth`.
- Nenhuma UI de cadastro/login — isso é a feature 2.

### Deploy no Railway

- Faz parte do "done" do setup: serviço `prumo` + PostgreSQL gerenciado no ar, com a página placeholder acessível publicamente e migrations aplicadas no deploy.

### Página inicial (placeholder)

- Placeholder com identidade: nome "Prumo", tagline "Sua vida financeira alinhada." e o significado do nome, já estilizada com Tailwind + shadcn/ui.

### Agent's Discretion

- Escolha e configuração detalhada do plugin de lint de fronteiras (eslint-plugin-boundaries vs import rules), desde que violações quebrem build e CI (AD-010).
- Layout/estética exata da página placeholder, respeitando a identidade descrita no PROJECT.md.
- Organização interna dos arquivos de configuração (vitest workspace vs configs separados etc.).

### Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área foi recusada — todas as 5 áreas apresentadas foram decididas. Assumptions adicionais de menor porte estão registradas na seção Assumptions & Open Questions da spec.

---

## Specific References

- Identidade do produto e regras de arquitetura conforme `PROJECT.md` (fonte da verdade para estrutura de pastas, grafo de módulos e documentação obrigatória).
- Decisões AD-001 a AD-012 em `.specs/STATE.md` — ativas, não reabrir.

---

## Deferred Ideas

None — discussion stayed within feature scope.
