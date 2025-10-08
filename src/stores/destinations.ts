import { ref } from 'vue';
import { defineStore } from 'pinia';
import { apiClient } from '../lib/api';

export interface Destination {
  id: number;
  slug: string;
  city_id: number;
  city: string;
  state: string | null;
  state_code?: string | null;
  country: string;
  label: string;
}

type CacheEntry = {
  timestamp: number;
  data: Destination[];
};

const STORAGE_KEY = 'travel-destinations-cache';
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 horas
const MAX_CACHE_ENTRIES = 20;

const loadCache = (): Record<string, CacheEntry> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored) as Record<string, CacheEntry>;

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

const persistCache = (cache: Record<string, CacheEntry>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Ignora falhas de escrita em ambientes restritos.
  }
};

const normalizeQuery = (value: string): string => value.trim().toLocaleLowerCase();

export const useDestinationsStore = defineStore('destinations', () => {
  const loading = ref(false);
  const cache = ref<Record<string, CacheEntry>>(loadCache());

  const trimCache = () => {
    const entries = Object.entries(cache.value);

    if (entries.length <= MAX_CACHE_ENTRIES) {
      return;
    }

    entries
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, entries.length - MAX_CACHE_ENTRIES)
      .forEach(([key]) => {
        delete cache.value[key];
      });
  };

  const search = async (query: string): Promise<Destination[]> => {
    const normalized = normalizeQuery(query);

    if (!normalized) {
      return [];
    }

    const cached = cache.value[normalized];

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    loading.value = true;

    try {
      const { data } = await apiClient.get<{ data: Destination[] }>('/destinations', {
        params: {
          q: query,
          limit: 10,
        },
      });

      const payload = Array.isArray(data.data) ? data.data : [];
      cache.value[normalized] = {
        timestamp: Date.now(),
        data: payload,
      };

      trimCache();
      persistCache(cache.value);

      return payload;
    } catch (error) {
      throw error;
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    search,
  };
});
