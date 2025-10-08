const STATUS_LABELS: Record<string, string> = {
  requested: 'Solicitado',
  approved: 'Aprovado',
  cancelled: 'Cancelado',
};

export const getStatusLabel = (status: string): string =>
  STATUS_LABELS[status] ?? status;
