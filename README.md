## Deploy no Railway

Configuração de deploy (código): `railway.json` define o build (`pnpm install --frozen-lockfile && pnpm build`) e o start (`pnpm start:prod`, que roda `prisma migrate deploy && next start` — o `&&` garante que o deploy aborta e não serve tráfego se a migration falhar).

A criação do serviço/projeto e a conexão com o PostgreSQL gerenciado são passos manuais, feitos uma única vez pelo mantenedor com acesso à conta do Railway:

1. Criar um projeto no Railway com um serviço chamado `prumo`, conectado a este repositório na branch `main`.
2. Adicionar um serviço PostgreSQL gerenciado ao mesmo projeto.
3. Configurar as variáveis de ambiente do serviço `prumo`:
   - `DATABASE_URL` — referência ao Postgres gerenciado (o Railway injeta automaticamente via variável de referência, ex.: `${{Postgres.DATABASE_URL}}`).
   - `BETTER_AUTH_SECRET` — valor secreto gerado para produção (nunca reaproveitar o valor usado em desenvolvimento/CI).
   - `BETTER_AUTH_URL` — URL pública do serviço no Railway.
4. Após o primeiro deploy, confirmar que a URL pública responde 200 com o placeholder do Prumo.

### Branch protection recomendada no GitHub

- Proteger a branch `main`: exigir que o workflow `ci.yml` passe (todos os 5 jobs) antes de permitir merge.
- Exigir revisão de pull request antes do merge.
- Não permitir push direto para `main`.
