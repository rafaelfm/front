import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiClient } from '../lib/api';
import { toApiDate } from '../lib/date';
import type { BackendUser } from './auth';

export type TravelStatus = 'requested' | 'approved' | 'cancelled';

export interface TravelRequestCityState {
  id: number;
  name: string;
  code?: string | null;
  [key: string]: unknown;
}

export interface TravelRequestCity {
  id: number;
  name: string;
  state_id: number | null;
  country_id: number;
  state?: TravelRequestCityState | null;
  country?: TravelRequestCityState | null;
  [key: string]: unknown;
}

export interface TravelRequest {
  id: number;
  city_id: number | null;
  requester_name: string;
  departure_date: string;
  return_date: string;
  status: TravelStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: BackendUser;
  city?: TravelRequestCity | null;
  location_label: string;
}

export interface TravelFilters {
  status: TravelStatus | 'all';
  location: string;
  departureFrom: string;
  departureTo: string;
  returnFrom: string;
  returnTo: string;
}

type ApiTravelRequest = Omit<TravelRequest, 'location_label'> & {
  location_label?: string | null;
};

type TravelRequestCollectionResponse = {
  data: ApiTravelRequest[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

type TravelRequestResourceResponse = {
  data: ApiTravelRequest;
};

const extractErrorMessages = (input: unknown): string[] => {
  if (typeof input === 'object' && input !== null) {
    const candidate = input as {
      errors?: Record<string, unknown> | null;
      message?: unknown;
    };

    if (candidate.errors && typeof candidate.errors === 'object') {
      const messages: string[] = [];

      Object.values(candidate.errors).forEach((value) => {
        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (typeof entry === 'string' && entry.trim() !== '') {
              messages.push(entry.trim());
            }
          });
        } else if (typeof value === 'string' && value.trim() !== '') {
          messages.push(value.trim());
        }
      });

      if (messages.length > 0) {
        return messages;
      }
    }

    if (typeof candidate.message === 'string' && candidate.message.trim() !== '') {
      return [candidate.message.trim()];
    }
  }

  return ['Não foi possível processar a solicitação.'];
};

const buildLocationLabel = (request: Pick<ApiTravelRequest | TravelRequest, 'location_label' | 'city'>): string => {
  if (typeof request.location_label === 'string' && request.location_label.trim() !== '') {
    return request.location_label.trim();
  }

  const city = request.city;

  if (!city) {
    return '';
  }

  const parts = [
    city.name,
    city.state?.code || city.state?.name || '',
    city.country?.name || '',
  ]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part !== '');

  return parts.join(', ');
};

const normalizeTravelRequest = (request: ApiTravelRequest): TravelRequest => ({
  ...request,
  departure_date: toApiDate(request.departure_date) ?? request.departure_date,
  return_date: toApiDate(request.return_date) ?? request.return_date,
  location_label: buildLocationLabel(request),
  city_id:
    request.city_id === null || request.city_id === undefined
      ? null
      : Number(request.city_id),
});

export const useTravelRequestsStore = defineStore('travel-requests', () => {
  const items = ref<TravelRequest[]>([]);
  const loading = ref(false);
  const error = ref('');
  const filters = reactive<TravelFilters>({
    status: 'all',
    location: '',
    departureFrom: '',
    departureTo: '',
    returnFrom: '',
    returnTo: '',
  });
  const pagination = reactive({
    currentPage: 1,
    perPage: 10,
    total: 0,
    lastPage: 1,
  });

  const filtered = computed(() => items.value);

  const resetFilters = () => {
    filters.status = 'all';
    filters.location = '';
    filters.departureFrom = '';
    filters.departureTo = '';
    filters.returnFrom = '';
    filters.returnTo = '';
  };

  const goToPage = async (page: number) => {
    const targetPage = Math.max(1, Math.min(page, pagination.lastPage || 1));

    if (targetPage === pagination.currentPage) {
      return fetch();
    }

    pagination.currentPage = targetPage;
    await fetch();
  };

  const setPerPage = async (perPage: number) => {
    const normalized = Math.max(1, perPage);

    if (normalized === pagination.perPage) {
      return fetch();
    }

    pagination.perPage = normalized;
    pagination.currentPage = 1;
    await fetch();
  };

  const fetch = async () => {
    loading.value = true;
    error.value = '';

    try {
      const { data } = await apiClient.get<TravelRequestCollectionResponse>('/travel-requests', {
        params: {
          status: filters.status === 'all' ? undefined : filters.status,
          location: filters.location || undefined,
          departure_from: toApiDate(filters.departureFrom) ?? undefined,
          departure_to: toApiDate(filters.departureTo) ?? undefined,
          return_from: toApiDate(filters.returnFrom) ?? undefined,
          return_to: toApiDate(filters.returnTo) ?? undefined,
          page: pagination.currentPage,
          per_page: pagination.perPage,
        },
      });

      const normalizedItems = Array.isArray(data.data)
        ? data.data.map(normalizeTravelRequest)
        : [];

      items.value = normalizedItems;
      const meta = data.meta ?? {};
      pagination.currentPage = meta.current_page ?? pagination.currentPage;
      pagination.lastPage = meta.last_page ?? pagination.lastPage;
      pagination.perPage = meta.per_page ?? pagination.perPage;
      pagination.total = meta.total ?? normalizedItems.length;
    } catch (err) {
      const messages = extractErrorMessages(err);
      error.value = messages.join(' ');
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: {
    requester_name: string;
    city_id: number;
    departure_date: string;
    return_date: string;
    notes?: string | null;
  }) => {
    error.value = '';
    loading.value = true;

    try {
      const body = {
        ...payload,
        city_id: payload.city_id,
        departure_date: toApiDate(payload.departure_date) ?? payload.departure_date,
        return_date: toApiDate(payload.return_date) ?? payload.return_date,
        notes:
          typeof payload.notes === 'string' && payload.notes.trim() === ''
            ? null
            : payload.notes,
      };

      const { data } = await apiClient.post<TravelRequestResourceResponse>('/travel-requests', body);
      const created = normalizeTravelRequest(data.data);

      items.value = [created, ...items.value];
      pagination.total += 1;
      return created;
    } catch (err) {
      const messages = extractErrorMessages(err);
      error.value = messages.join(' ');

      const enrichedError: Record<string, unknown> =
        typeof err === 'object' && err !== null
          ? { ...(err as Record<string, unknown>) }
          : {};

      enrichedError.messages = messages;

      if (typeof enrichedError.message !== 'string' || enrichedError.message.trim() === '') {
        enrichedError.message = messages.join('\n');
      }

      throw enrichedError;
    } finally {
      loading.value = false;
    }
  };

  const updateStatus = async (id: number, status: TravelStatus) => {
    error.value = '';

    try {
      const { data } = await apiClient.patch<TravelRequestResourceResponse>(`/travel-requests/${id}/status`, {
        status,
      });

      const updated = normalizeTravelRequest(data.data);

      items.value = items.value.map((item) =>
        item.id === id ? updated : item,
      );

      return updated;
    } catch (err) {
      const messages = extractErrorMessages(err);
      error.value = messages.join(' ');

      const enrichedError: Record<string, unknown> =
        typeof err === 'object' && err !== null
          ? { ...(err as Record<string, unknown>) }
          : {};

      enrichedError.messages = messages;

      if (typeof enrichedError.message !== 'string' || enrichedError.message.trim() === '') {
        enrichedError.message = messages.join('\n');
      }

      throw enrichedError;
    }
  };

  return {
    items,
    filtered,
    loading,
    error,
    filters,
    pagination,
    resetFilters,
    goToPage,
    setPerPage,
    fetch,
    create,
    updateStatus,
  };
});
