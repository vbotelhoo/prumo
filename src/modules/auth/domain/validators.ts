// Validadores puros do cadastro (design.md, componente 2; spec.md, story
// "Cadastro com perfil completo" e "Endereço via CEP"). Zero dependências de
// Next/React/Prisma neste diretório (regra 3 de fronteira do PROJECT.md) —
// mesmo padrão de `src/shared/money/`.

// Edge case (spec.md): CPF pode chegar com máscara (`000.000.000-00`) ou
// sem — normaliza para 11 dígitos antes de validar/persistir.
export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

// Edge case (spec.md): CEP pode chegar com máscara (`00000-000`) ou sem —
// normaliza para 8 dígitos antes de consultar/persistir.
export function normalizeZipCode(raw: string): string {
  return raw.replace(/\D/g, "");
}

// AC1.6 (spec.md, story "Cadastro"): algoritmo oficial dos dígitos
// verificadores do CPF. Espera `cpf` já normalizado (11 dígitos); qualquer
// outro formato (tamanho errado, todos os dígitos iguais) é inválido.
export function isValidCpf(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) {
    return false;
  }

  // CPFs com todos os dígitos iguais passam matematicamente no cálculo dos
  // verificadores mas nunca são documentos reais válidos — a Receita
  // Federal os rejeita explicitamente.
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digits = cpf.split("").map(Number);

  const firstCheckDigit = calculateCpfCheckDigit(digits.slice(0, 9), 10);
  if (firstCheckDigit !== digits[9]) {
    return false;
  }

  const secondCheckDigit = calculateCpfCheckDigit(digits.slice(0, 10), 11);
  return secondCheckDigit === digits[10];
}

function calculateCpfCheckDigit(base: number[], startWeight: number): number {
  const sum = base.reduce(
    (acc, digit, index) => acc + digit * (startWeight - index),
    0,
  );
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

// AC1.5 (spec.md, story "Cadastro"): idade >= 18 anos a partir de
// `birthDate` (YYYY-MM-DD). Data inválida ou futura é rejeitada (`false`),
// conforme "inválida/futura" explicitamente coberto pelo AC.
export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return false;
  }

  const [year, month, day] = birthDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  // Rejeita datas que o construtor `Date` "normaliza" (ex.: 2024-02-30 vira
  // 2024-03-01) — só datas de calendário reais são válidas.
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return false;
  }

  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  if (parsed.getTime() > todayUtc.getTime()) {
    return false;
  }

  let age = todayUtc.getUTCFullYear() - parsed.getUTCFullYear();
  const monthDiff = todayUtc.getUTCMonth() - parsed.getUTCMonth();
  const dayDiff = todayUtc.getUTCDate() - parsed.getUTCDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age >= 18;
}
