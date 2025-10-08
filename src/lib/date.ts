const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2}T/;
const PT_BR_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const toDateInstance = (value: string): Date | null => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Normaliza qualquer entrada de data (Date, ISO, pt-BR) para o formato `YYYY-MM-DD`.
 */
export const toApiDate = (
  value: string | Date | null | undefined,
): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();

  if (ISO_DATE_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (ISO_DATE_TIME_REGEX.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  const ptMatch = PT_BR_DATE_REGEX.exec(trimmed);

  if (ptMatch) {
    const [, day, month, year] = ptMatch;
    return `${year}-${month}-${day}`;
  }

  const dateInstance = toDateInstance(trimmed);

  return dateInstance ? dateInstance.toISOString().slice(0, 10) : null;
};

/**
 * Formata uma data qualquer para exibição no padrão `dd/MM/yyyy`.
 */
export const formatDateForDisplay = (
  value: string | Date | null | undefined,
): string => {
  const apiDate = toApiDate(value);

  if (!apiDate) {
    return '';
  }

  const [year, month, day] = apiDate.split('-');

  return `${day}/${month}/${year}`;
};
