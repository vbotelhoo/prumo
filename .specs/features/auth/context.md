# Auth Context

**Gathered:** 2026-07-16
**Spec:** `.specs/features/auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Cadastro e login com e-mail/senha (Better Auth), sessão e logout — feature 2 do ROADMAP. A fundação técnica já existe do setup (instância Better Auth com `emailAndPassword`, handler em `/api/auth/[...all]`, tabelas migradas); esta feature entrega os fluxos de usuário (UI + validações + perfil de cadastro) por cima disso. E2E obrigatório: cadastro → login → logout.

---

## Implementation Decisions

### Rotas e destino pós-login / pós-logout

- Paths de URL em inglês (regra de projeto — AD-014): `/signup`, `/login`, `/terms`, `/app`.
- Texto da UI em pt-BR.
- Pós-login e pós-cadastro: página interna placeholder protegida `/app` (saudação com o nome do usuário + botão de logout). O dashboard substitui essa página na feature 6.
- Acesso não autenticado a rota protegida redireciona para `/login`.
- Pós-logout: home (`/`). A home receberá, no futuro, o direcionamento para login; nesta feature basta o redirect para `/`.

### Formulário de cadastro (campos e validações)

- Campos: **nome**, **data de nascimento**, **CPF**, **endereço** (com consulta por CEP), **e-mail**, **senha**, **confirmação de senha**, **aceite de termos**.
- Senha: mínimo 8 caracteres, pelo menos 1 letra minúscula, 1 maiúscula, 1 dígito numérico e 1 caractere especial.
- Confirmação de senha deve ser idêntica à senha.
- Data de nascimento: idade mínima de 18 anos (produto financeiro).
- CPF: validação pelos dígitos verificadores (algoritmo oficial) + **único no banco** (um CPF = uma conta).

### Endereço via CEP

- Provedor: **ViaCEP** (gratuito, sem chave de API).
- Consulta preenche logradouro, bairro, cidade, UF; **número** e **complemento (opcional)** são manuais.
- Fail-open: em falha da API ou CEP não encontrado, os campos ficam editáveis para preenchimento manual — o cadastro **nunca** é bloqueado pela API externa.
- Campos persistidos: CEP, logradouro, número, complemento (opcional), bairro, cidade, UF.

### Aceite de termos

- Checkbox obrigatório linkando para `/terms` (conteúdo placeholder por ora).
- Timestamp do aceite persistido no banco.

### Mensagens de erro (anti-enumeração)

- Login com credenciais erradas: mensagem genérica ("e-mail ou senha inválidos").
- Cadastro com e-mail ou CPF já existente: mesma mensagem genérica de falha, sem revelar qual campo já está cadastrado.

### Sessão

- Duração padrão do Better Auth (7 dias, renovada com uso).
- Sem "lembrar de mim".

### Agent's Discretion

- Layout/estética das páginas de auth (dentro do padrão Tailwind + shadcn/ui, AD-004).
- Máscara/formatação dos campos CPF, CEP e data no formulário.
- Texto exato das mensagens genéricas de erro (exceto a frase de login, já fixada).

### Declined / Undiscussed Gray Areas → Assumptions

Todas as assumptions abertas da primeira rodada foram confirmadas pelo usuário em 2026-07-16 (ver tabela na spec). Restam apenas decisões de Design (modelagem de persistência do perfil).

---

## Specific References

Nenhuma referência externa de produto — aberto a abordagens padrão dentro do stack já decidido (Better Auth, Tailwind + shadcn/ui, Zod).

---

## Deferred Ideas

None — discussão ficou dentro do escopo da feature. (Verificação de e-mail, recuperação de senha, login social e MFA já estavam fora do MVP por AD-005. Link de login na home fica para quando a home for evoluída.)
