# Auth Specification

**Feature**: `auth` — Roadmap item 2
**Context**: `.specs/features/auth/context.md` (decisões do usuário para as áreas cinzentas)

## Problem Statement

O Prumo está no ar com Better Auth instalado, mas sem nenhum fluxo de usuário: não há como criar conta, entrar ou sair. Toda feature seguinte do roadmap (categorias, transações, compromissos, projeções) escopa dados ao usuário autenticado (AD-012) — sem cadastro/login funcionais, nada mais pode ser construído.

## Goals

- [ ] Usuário consegue criar conta com perfil completo (nome, nascimento, CPF, endereço, e-mail/senha, aceite de termos) e sai autenticado.
- [ ] Usuário consegue entrar e sair; a sessão persiste entre reloads e expira conforme o padrão do Better Auth.
- [ ] Rotas internas são protegidas: não autenticado é redirecionado para `/login`.
- [ ] E2E cobre o fluxo cadastro → login → logout.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Verificação de e-mail | Fora do MVP (AD-005) |
| Recuperação de senha ("esqueci minha senha") | Roadmap item 2 cobre só cadastro/login/sessão/logout |
| Login social (OAuth) e MFA | Fora do MVP (AD-005) |
| Edição de perfil/endereço pós-cadastro | Feature futura; aqui só captura no cadastro |
| Conteúdo jurídico real dos termos de uso | Página placeholder; conteúdo real é responsabilidade do mantenedor |
| Rate limiting custom de tentativas de login | MVP usa o comportamento padrão do Better Auth |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Rota da página de termos | `/terms` | Consistência com as rotas em inglês (`/signup`, `/login`) escolhidas pelo usuário; a opção discutida citava "/termos" antes da decisão por rotas em inglês | n |
| Destino pós-logout | Home (`/`) | Página pública natural após encerrar sessão | n |
| Conteúdo da página interna placeholder (`/app`) | Saudação com o nome do usuário + botão de logout | Mínimo que prova sessão ativa e viabiliza o E2E; substituída pelo dashboard na feature 6 | n |
| Resposta a e-mail OU CPF já cadastrados | Mesma mensagem genérica de falha do cadastro, sem indicar o campo causador | Anti-enumeração (decisão do usuário para e-mail; CPF é o mesmo vetor) | y (e-mail) / n (CPF estendido) |
| Idioma da UI | pt-BR | Produto brasileiro; toda a documentação e identidade são em pt-BR | n |
| Requisito de dígito na senha | Não exigido | Usuário especificou exatamente: 8+ chars, 1 minúscula, 1 maiúscula, 1 especial — sem citar dígito; não inventar requisito | n |
| Persistência do perfil (nascimento, CPF, endereço, aceite) | Vinculada 1:1 ao usuário Better Auth; modelagem exata (campos extras vs. tabela própria) é decisão de Design | Spec define O QUE persistir; COMO é do Design | n |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Cadastro com perfil completo ⭐ MVP

**User Story**: Como visitante, quero criar minha conta informando meus dados pessoais, endereço e credenciais, para começar a usar o Prumo já autenticado.

**Why P1**: Sem cadastro não existe usuário; toda feature seguinte depende de contas reais (AD-012).

**Acceptance Criteria**:

1. WHEN o visitante acessa `/signup` THEN o sistema SHALL exibir o formulário com os campos: nome, data de nascimento, CPF, CEP, logradouro, número, complemento (opcional), bairro, cidade, UF, e-mail, senha, confirmação de senha e checkbox de aceite de termos com link para a página de termos.
2. WHEN o visitante submete o formulário com todos os campos válidos THEN o sistema SHALL criar a conta, persistir o perfil (nascimento, CPF, endereço) e o timestamp do aceite de termos vinculados ao usuário, iniciar a sessão e redirecionar para a página interna protegida.
3. WHEN a senha submetida tem menos de 8 caracteres OU não contém ao menos 1 letra minúscula, 1 maiúscula e 1 caractere especial THEN o sistema SHALL rejeitar a submissão exibindo a regra completa de senha junto ao campo.
4. WHEN a confirmação de senha difere da senha THEN o sistema SHALL rejeitar a submissão indicando a divergência.
5. WHEN a data de nascimento corresponde a idade menor que 18 anos (ou é inválida/futura) THEN o sistema SHALL rejeitar a submissão indicando a exigência de 18+.
6. WHEN o CPF submetido falha na validação dos dígitos verificadores (algoritmo oficial) THEN o sistema SHALL rejeitar a submissão indicando CPF inválido.
7. WHEN o e-mail OU o CPF submetidos já pertencem a uma conta existente THEN o sistema SHALL rejeitar com a mesma mensagem genérica de falha, sem revelar qual campo já está cadastrado (anti-enumeração), e SHALL NOT criar conta nem perfil parcial.
8. WHEN o checkbox de termos não está marcado THEN o sistema SHALL impedir a submissão.
9. WHEN a validação server-side falha THEN o sistema SHALL rejeitar independentemente de qualquer validação client-side (a fronteira valida com Zod — AD-003).

**Independent Test**: Acessar `/signup`, preencher dados válidos, submeter → cai autenticado na página interna; repetir com cada violação de campo → erro correspondente sem conta criada.

---

### P1: Endereço via CEP (ViaCEP com fail-open) ⭐ MVP

**User Story**: Como visitante me cadastrando, quero digitar meu CEP e ter o endereço preenchido automaticamente, para não digitar tudo à mão.

**Why P1**: Faz parte do formulário de cadastro definido pelo usuário; o fail-open é crítico para o cadastro nunca depender de API de terceiros.

**Acceptance Criteria**:

1. WHEN o visitante informa um CEP válido e a consulta ao ViaCEP retorna dados THEN o sistema SHALL preencher logradouro, bairro, cidade e UF, mantendo número e complemento para preenchimento manual.
2. WHEN a consulta ao ViaCEP falha (timeout, erro de rede, indisponibilidade) OU o CEP não é encontrado THEN o sistema SHALL manter/tornar todos os campos de endereço editáveis para preenchimento manual e SHALL NOT bloquear a submissão do cadastro por causa disso.
3. WHEN os campos preenchidos pela consulta são exibidos THEN o sistema SHALL permitir que o visitante os edite antes de submeter (a consulta é conveniência, não autoridade).

**Independent Test**: Informar CEP real → campos preenchidos; simular API fora do ar → campos editáveis e cadastro concluível manualmente.

---

### P1: Login e sessão ⭐ MVP

**User Story**: Como usuário cadastrado, quero entrar com e-mail e senha e permanecer logado, para acessar minhas informações com segurança.

**Why P1**: Sem login não há retorno ao produto; sessão é a base do escopo por usuário.

**Acceptance Criteria**:

1. WHEN o visitante acessa `/login` THEN o sistema SHALL exibir formulário com e-mail e senha.
2. WHEN credenciais corretas são submetidas THEN o sistema SHALL iniciar a sessão e redirecionar para a página interna protegida.
3. WHEN credenciais incorretas são submetidas (e-mail inexistente OU senha errada) THEN o sistema SHALL exibir a mesma mensagem genérica ("e-mail ou senha inválidos"), sem distinguir os casos.
4. WHEN o usuário autenticado recarrega a página ou fecha e reabre o navegador dentro da validade da sessão THEN o sistema SHALL mantê-lo autenticado (duração padrão do Better Auth: 7 dias, renovada com uso).
5. WHEN um visitante não autenticado acessa a página interna protegida THEN o sistema SHALL redirecioná-lo para `/login`.
6. WHEN um usuário já autenticado acessa `/login` ou `/signup` THEN o sistema SHALL redirecioná-lo para a página interna protegida.

**Independent Test**: Login com credenciais válidas → página interna; reload → continua logado; credenciais erradas → mensagem genérica; acessar página interna deslogado → redirect a `/login`.

---

### P1: Logout ⭐ MVP

**User Story**: Como usuário autenticado, quero sair da minha conta, para encerrar minha sessão com segurança.

**Why P1**: Fecha o ciclo de sessão exigido pelo roadmap e pelo E2E.

**Acceptance Criteria**:

1. WHEN o usuário autenticado aciona o logout na página interna THEN o sistema SHALL encerrar a sessão e redirecionar para a home (`/`).
2. WHEN, após o logout, o usuário tenta acessar a página interna protegida THEN o sistema SHALL redirecioná-lo para `/login` (sessão de fato destruída, não só cookie apagado no client).

**Independent Test**: Logar, clicar em sair → home; voltar à página interna → redirect a `/login`.

---

### P2: Página de termos

**User Story**: Como visitante me cadastrando, quero ler os termos que estou aceitando, para saber com o que estou concordando.

**Why P2**: O aceite (P1) exige um destino para o link; o conteúdo real é placeholder e não bloqueia o MVP.

**Acceptance Criteria**:

1. WHEN o visitante acessa `/terms` (diretamente ou pelo link do cadastro) THEN o sistema SHALL exibir a página de termos com conteúdo placeholder identificado como tal, acessível sem autenticação.

**Independent Test**: Abrir `/terms` deslogado → página renderiza com placeholder.

---

## Edge Cases

- WHEN dois cadastros com o mesmo CPF (ou e-mail) são submetidos concorrentemente THEN o sistema SHALL garantir que apenas um sucede (unicidade garantida por constraint no banco, não só por verificação prévia).
- WHEN o cadastro falha após a criação parcial de dados (ex.: usuário criado mas perfil falhou) THEN o sistema SHALL NOT deixar conta órfã utilizável — criação de usuário + perfil + aceite é atômica.
- WHEN o CPF é submetido com máscara (`000.000.000-00`) ou sem THEN o sistema SHALL normalizar para 11 dígitos antes de validar e persistir.
- WHEN o CEP é submetido com máscara (`00000-000`) ou sem THEN o sistema SHALL normalizar para 8 dígitos antes de consultar e persistir.
- WHEN a consulta ViaCEP demora além do timeout definido THEN o sistema SHALL tratar como falha (fail-open, campos manuais) — nunca travar o formulário indefinidamente.
- WHEN a sessão expira com o usuário na página interna THEN a próxima navegação/ação protegida SHALL redirecioná-lo para `/login`.
- WHEN campos de texto recebem espaços nas bordas THEN o sistema SHALL fazer trim antes de validar (e-mail, nome, endereço).

## Implicit-Requirement Dimensions Sweep

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Coberto: ACs de senha, CPF, idade, termos, normalização de máscaras, validação Zod server-side |
| Failure / partial-failure | Coberto: ViaCEP fail-open; atomicidade usuário+perfil+aceite |
| Idempotency / duplicates | Coberto: unicidade de e-mail/CPF por constraint; concorrência no edge case |
| Auth boundaries & rate limits | Boundaries cobertos (redirect de rotas protegidas); rate limiting custom fora do escopo (assumption logada) |
| Concurrency / ordering | Coberto: edge case de cadastro concorrente com mesmo CPF/e-mail |
| Data lifecycle / expiry | Sessão: padrão Better Auth (7d, renovada). Exclusão de conta: N/A because fora do escopo do MVP |
| Observability | N/A because MVP usa logs padrão do framework; sem requisito adicional desta feature |
| External-dependency failure | Coberto: ViaCEP fail-open com timeout |
| State-transition integrity | Coberto: logout destrói sessão no servidor (não só client); redirect autenticado em `/login`/`/signup` |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Cadastro (formulário completo em `/signup`) | Design | Pending |
| AUTH-02 | P1: Cadastro (validações: senha, confirmação, idade 18+, CPF dígitos, termos) | Design | Pending |
| AUTH-03 | P1: Cadastro (unicidade e-mail/CPF + erro genérico anti-enumeração + atomicidade) | Design | Pending |
| AUTH-04 | P1: Cadastro (persistência do perfil + timestamp do aceite) | Design | Pending |
| AUTH-05 | P1: Cadastro (validação server-side Zod na fronteira) | Design | Pending |
| AUTH-06 | P1: CEP (consulta ViaCEP preenche endereço) | Design | Pending |
| AUTH-07 | P1: CEP (fail-open: falha/não encontrado → manual, nunca bloqueia) | Design | Pending |
| AUTH-08 | P1: Login (formulário + sessão + redirect pós-login) | Design | Pending |
| AUTH-09 | P1: Login (erro genérico para credenciais inválidas) | Design | Pending |
| AUTH-10 | P1: Sessão (persistência 7d renovável + expiração) | Design | Pending |
| AUTH-11 | P1: Sessão (proteção de rotas: redirect deslogado → `/login`; logado em `/login`/`/signup` → interna) | Design | Pending |
| AUTH-12 | P1: Logout (destrói sessão server-side + redirect home) | Design | Pending |
| AUTH-13 | P2: Página de termos (`/terms` placeholder pública) | Design | Pending |
| AUTH-14 | P1: E2E (cadastro → login → logout) | Design | Pending |

**Coverage:** 14 total, 0 mapped to tasks, 14 unmapped ⚠️ (mapeamento acontece na fase Tasks)

---

## Success Criteria

- [ ] Um visitante consegue criar conta, sair e entrar de novo usando apenas a UI, em produção.
- [ ] Nenhuma resposta do sistema permite descobrir se um e-mail ou CPF já tem conta.
- [ ] Cadastro conclui mesmo com o ViaCEP fora do ar (endereço manual).
- [ ] Zero contas criadas com CPF inválido, menor de 18, senha fora da política ou sem aceite de termos (verificado por testes de integração da fronteira).
- [ ] E2E cadastro → login → logout verde no CI.
