import { computed, reactive, ref } from 'vue';
import { defineStore } from 'pinia';
import { apiClient } from '../lib/api';
import type { BackendUser } from './auth';

export type TravelStatus = 'requested' | 'approved' | 'cancelled';

export interface TravelRequest {
  id: number;
  requester_name: string;
  destination: string;
  departure_date: string;
  return_date: string;
  status: TravelStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: BackendUser;
}

export interface TravelFilters {
  status: TravelStatus | 'all';
  destination: string;
  from: string;
  to: string;
}

export const useTravelRequestsStore = defineStore('travel-requests', () => {
  const items = ref<TravelRequest[]>([]);
  const loading = ref(false);
  const error = ref('');
  const filters = reactive<TravelFilters>({
    status: 'all',
    destination: '',
    from: '',
    to: '',
  });
  const pagination = reactive({
    currentPage: 1,
    perPage: 15,
    total: 0,
    lastPage: 1,
  });

  const filtered = computed(() => {
    if (filters.status === 'all' && !filters.destination && !filters.from && !filters.to) {
      return items.value;
    }

    return items.value.filter((item) => {
      const statusMatch =
        filters.status === 'all' ? true : item.status === filters.status;
      const destinationMatch = filters.destination
        ? item.destination.toLocaleLowerCase().includes(filters.destination.toLocaleLowerCase())
        : true;
      const fromMatch = filters.from ? item.departure_date >= filters.from : true;
      const toMatch = filters.to ? item.return_date <= filters.to : true;

      return statusMatch && destinationMatch && fromMatch && toMatch;
    });
  });

  const resetFilters = () => {
    filters.status = 'all';
    filters.destination = '';
    filters.from = '';
    filters.to = '';
  };

  const fetch = async () => {
    loading.value = true;
    error.value = '';

    try {
      const { data } = await apiClient.get('/travel-requests', {
        params: {
          status: filters.status === 'all' ? undefined : filters.status,
          destination: filters.destination || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          page: pagination.currentPage,
          per_page: pagination.perPage,
        },
      });

      items.value = data.data;
      pagination.currentPage = data.meta?.current_page ?? 1;
      pagination.lastPage = data.meta?.last_page ?? 1;
      pagination.perPage = data.meta?.per_page ?? 15;
      pagination.total = data.meta?.total ?? data.data.length;
    } catch (err) {
      error.value =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Não foi possível carregar os pedidos de viagem.';
    } finally {
      loading.value = false;
    }
  };

  const create = async (payload: {
    requester_name: string;
    destination: string;
    departure_date: string;
    return_date: string;
    notes?: string | null;
  }) => {
    error.value = '';
    loading.value = true;

    try {
      const { data } = await apiClient.post('/travel-requests', payload);
      items.value = [data.data, ...items.value];
      pagination.total += 1;
      return data.data as TravelRequest;
    } catch (err) {
      error.value =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Não foi possível criar o pedido.';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const updateStatus = async (id: number, status: TravelStatus) => {
    error.value = '';

    try {
      const { data } = await apiClient.patch(`/travel-requests/${id}/status`, {
        status,
      });

      items.value = items.value.map((item) =>
        item.id === id ? ({ ...item, ...data.data } as TravelRequest) : item,
      );

      return data.data as TravelRequest;
    } catch (err) {
      error.value =
        typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message?: unknown }).message)
          : 'Não foi possível atualizar o status.';
      throw err;
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
    fetch,
    create,
    updateStatus,
  };
});
