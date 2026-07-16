# Auth Context

**Gathered:** 2026-07-16
**Spec:** `.specs/features/auth/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Cadastro e login com e-mail/senha (Better Auth), sessão e logout — feature 2 do ROADMAP. A fundação técnica já existe do setup (instância Better Auth com `emailAndPassword`, handler em `/api/auth/[...all]`, tabelas migradas); esta feature entrega os fluxos de usuário (UI + validações + perfil de cadastro) por cima disso. E2E obrigatório: cadastro → login → logout.

---

## Implementation Decisions

### Rotas e destino pós-login

- Rotas em inglês: `/signup` e `/login`.
- Pós-login (e pós-cadastro) o usuário vai para uma página interna placeholder protegida (o dashboard só chega na feature 6).
- Acesso não autenticado a rota protegida redireciona para `/login`.

### Formulário de cadastro (campos e validações)

- Campos: **nome**, **data de nascimento**, **CPF**, **endereço** (com consulta por CEP), **e-mail**, **senha**, **confirmação de senha**, **aceite de termos**.
- Senha: mínimo 8 caracteres, pelo menos 1 letra minúscula, 1 maiúscula e 1 caractere especial.
- Confirmação de senha deve ser idêntica à senha.
- Data de nascimento: idade mínima de 18 anos (produto financeiro).
- CPF: validação pelos dígitos verificadores (algoritmo oficial) + **único no banco** (um CPF = uma conta).

### Endereço via CEP

- Provedor: **ViaCEP** (gratuito, sem chave de API).
- Consulta preenche logradouro, bairro, cidade, UF; **número** e **complemento (opcional)** são manuais.
- Fail-open: em falha da API ou CEP não encontrado, os campos ficam editáveis para preenchimento manual — o cadastro **nunca** é bloqueado pela API externa.
- Campos persistidos: CEP, logradouro, número, complemento (opcional), bairro, cidade, UF.

### Aceite de termos

- Checkbox obrigatório linkando para uma página de termos (conteúdo placeholder por ora).
- Timestamp do aceite persistido no banco.

### Mensagens de erro (anti-enumeração)

- Login com credenciais erradas: mensagem genérica ("e-mail ou senha inválidos").
- Cadastro com e-mail já existente: **não** revela que o e-mail tem conta — mensagem genérica.
- Mesmo tratamento para CPF já cadastrado (mesmo vetor de enumeração).

### Sessão

- Duração padrão do Better Auth (7 dias, renovada com uso).
- Sem "lembrar de mim".

### Agent's Discretion

- Layout/estética das páginas de auth (dentro do padrão Tailwind + shadcn/ui, AD-004).
- Máscara/formatação dos campos CPF, CEP e data no formulário.
- Texto exato das mensagens genéricas de erro.

### Declined / Undiscussed Gray Areas → Assumptions

Registradas na seção Assumptions & Open Questions da spec:

- Rota da página de termos: `/terms` (consistência com as rotas em inglês escolhidas).
- Destino pós-logout: home (`/`).
- Conteúdo da página interna placeholder: saudação com o nome do usuário + botão de logout.
- Idioma da UI: pt-BR.
- Rate limiting custom: fora do MVP (fica o comportamento padrão do Better Auth).

---

## Specific References

Nenhuma referência externa de produto — aberto a abordagens padrão dentro do stack já decidido (Better Auth, Tailwind + shadcn/ui, Zod).

---

## Deferred Ideas

None — discussão ficou dentro do escopo da feature. (Verificação de e-mail, recuperação de senha, login social e MFA já estavam fora do MVP por AD-005.)
