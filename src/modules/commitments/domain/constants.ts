// Error messages
export const COMMITMENT_NOT_FOUND_ERROR = "Compromisso não encontrado";
export const INSTALLMENT_NOT_FOUND_ERROR = "Parcela não encontrada";
export const INVALID_MODE_ERROR = "Modo de compromisso inválido";
export const INVALID_TOTAL_ERROR = "Valor total inválido ou fora do intervalo (R$ 0,01 a R$ 10.000.000,00)";
export const INVALID_INSTALLMENT_VALUE_ERROR = "Valor da parcela inválido ou fora do intervalo (R$ 0,01 a R$ 10.000.000,00)";
export const INVALID_INSTALLMENT_COUNT_ERROR = "Número de parcelas inválido (mínimo 2, máximo 360)";
export const INSTALLMENT_VALUE_TOO_SMALL_ERROR = "Número de parcelas gera parcelas menores que R$ 0,01";
export const INVALID_FIRST_DUE_DATE_ERROR = "Data da primeira parcela inválida ou fora da janela permitida (2000-01-01 a +100 anos)";
export const INVALID_DESCRIPTION_ERROR = "Descrição inválida (1-140 caracteres)";
export const INVALID_CATEGORY_ERROR = "Categoria inválida, incompatível ou pertence a outro usuário";
export const TOTAL_BELOW_PAID_ERROR = "Novo valor total não pode ser menor que a soma de parcelas já pagas";
export const COUNT_BELOW_PAID_ERROR = "Novo número de parcelas não pode ser menor que as parcelas já pagas";
export const INVALID_AMOUNT_ERROR = "Valor inválido — informe um valor em reais (ex: 1.250,00)";

// Constraints
export const MIN_INSTALLMENT_COUNT = 2;
export const MAX_INSTALLMENT_COUNT = 360;
export const MIN_AMOUNT_CENTS = 1; // R$ 0,01
export const MAX_AMOUNT_CENTS = 1_000_000_00; // R$ 10.000.000,00
export const MIN_DESCRIPTION_LENGTH = 1;
export const MAX_DESCRIPTION_LENGTH = 140;

// Formats
export const DATE_FORMAT = "YYYY-MM-DD";
export const MIN_DATE_STRING = "2000-01-01";
// MAX_DATE computed as 100 years from today (see schemas.ts)
