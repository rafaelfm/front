<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useTravelRequestsStore, type TravelStatus } from '../stores/travelRequests';
import DestinationAutocomplete from '../components/DestinationAutocomplete.vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { formatDateForDisplay, toApiDate } from '../lib/date';
import { getStatusLabel } from '../lib/status';

const auth = useAuthStore();
const travelStore = useTravelRequestsStore();
const router = useRouter();

const displayName = computed(() => auth.user?.name ?? 'Usuário');
const roleName = computed(() => {
  if (!auth.user) {
    return 'Sem função';
  }
  if (typeof auth.user.role === 'string' && auth.user.role.trim() !== '') {
    return auth.user.role;
  }
  if (Array.isArray(auth.user.roles) && auth.user.roles.length > 0) {
    return auth.user.roles[0];
  }
  return 'Sem função';
});

const canManage = computed(() => {
  const roles = Array.isArray(auth.user?.roles) ? auth.user?.roles : [];
  const role = typeof auth.user?.role === 'string' ? auth.user?.role : undefined;
  return roles?.includes('administrador') || role === 'administrador';
});

const statusOptions: Array<{ value: TravelStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'requested', label: 'Solicitado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const statusActions: Record<TravelStatus, TravelStatus[]> = {
  requested: ['approved', 'cancelled'],
  approved: [],
  cancelled: ['approved'],
};

const localError = ref('');
const localSuccess = ref('');
const departureFromPicker = ref<Date | null>(null);
const departureToPicker = ref<Date | null>(null);
const returnFromPicker = ref<Date | null>(null);
const returnToPicker = ref<Date | null>(null);
const today = new Date();
const pagination = computed(() => travelStore.pagination);
const hasItems = computed(() => travelStore.items.length > 0);
const isFirstPage = computed(() => pagination.value.currentPage <= 1);
const isLastPage = computed(() => pagination.value.currentPage >= pagination.value.lastPage);
const perPageOptions = [10, 15, 25];
today.setHours(0, 0, 0, 0);

const fetchData = async () => {
  localError.value = '';
  localSuccess.value = '';
  await travelStore.fetch();
  localError.value = travelStore.error;
};

onMounted(() => {
  fetchData().catch(() => {});
});

watch(
  () => travelStore.filters.departureFrom,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = departureFromPicker.value ? toApiDate(departureFromPicker.value) : null;

    if (iso !== currentIso) {
      departureFromPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(
  () => travelStore.filters.departureTo,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = departureToPicker.value ? toApiDate(departureToPicker.value) : null;

    if (iso !== currentIso) {
      departureToPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(
  () => travelStore.filters.returnFrom,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = returnFromPicker.value ? toApiDate(returnFromPicker.value) : null;

    if (iso !== currentIso) {
      returnFromPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(
  () => travelStore.filters.returnTo,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = returnToPicker.value ? toApiDate(returnToPicker.value) : null;

    if (iso !== currentIso) {
      returnToPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(departureFromPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== travelStore.filters.departureFrom) {
    travelStore.filters.departureFrom = iso;
  }
});

watch(departureToPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== travelStore.filters.departureTo) {
    travelStore.filters.departureTo = iso;
  }
});

watch(returnFromPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== travelStore.filters.returnFrom) {
    travelStore.filters.returnFrom = iso;
  }
});

watch(returnToPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== travelStore.filters.returnTo) {
    travelStore.filters.returnTo = iso;
  }
});

const handleStatusChange = async (id: number, status: TravelStatus) => {
  localError.value = '';
  localSuccess.value = '';

  try {
    await travelStore.updateStatus(id, status);
    await fetchData();
    localSuccess.value = 'Status atualizado com sucesso.';
  } catch (error) {
    const messages =
      typeof error === 'object' && error !== null && 'messages' in error && Array.isArray((error as { messages?: unknown }).messages)
        ? ((error as { messages?: unknown }).messages as unknown[])
            .map((item) => (typeof item === 'string' ? item : String(item)))
            .filter((message) => message.trim() !== '')
        : [];

    if (messages.length > 0) {
      localError.value = messages.join(' ');
    } else {
      localError.value =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Não foi possível atualizar o status.';
    }
  }
};

const goToCadastro = () => {
  router.push({ name: 'cadastrar' });
};

const changePage = (page: number) => {
  changePageAsync(page).catch(() => {});
};

const changePageAsync = async (page: number) => {
  await travelStore.goToPage(page);
  localError.value = travelStore.error;
};

const goToPreviousPage = () => {
  if (!isFirstPage.value) {
    changePage(pagination.value.currentPage - 1);
  }
};

const goToNextPage = () => {
  if (!isLastPage.value) {
    changePage(pagination.value.currentPage + 1);
  }
};

const handlePerPageChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null;
  if (!target) {
    return;
  }

  const value = Number(target.value);
  localSuccess.value = '';
  travelStore
    .setPerPage(value)
    .then(() => {
      localError.value = travelStore.error;
    })
    .catch(() => {});
};

const clearFilters = () => {
  travelStore.resetFilters();
  travelStore.pagination.currentPage = 1;
  localSuccess.value = '';
  departureFromPicker.value = null;
  departureToPicker.value = null;
  returnFromPicker.value = null;
  returnToPicker.value = null;
  fetchData().catch(() => {});
};

const applyFilters = () => {
  travelStore.pagination.currentPage = 1;
  localSuccess.value = '';
  fetchData().catch(() => {});
};
</script>

<template>
  <main class="dashboard">
    <header class="hero">
      <button type="button" class="primary" @click="goToCadastro">
        Novo Pedido
      </button>
    </header>

    <section class="filters">
      <label>
        <span>Status</span>
        <select v-model="travelStore.filters.status">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <div style="margin-right: 20px;">
        <DestinationAutocomplete
          v-model="travelStore.filters.location"
          label="Local"
          placeholder="Cidade, estado ou país"
        />
      </div>
      <div class="range-filter">
        <span>Ida</span>
        <div class="range-inputs">
          <Datepicker
            v-model="departureFromPicker"
            :format="'dd/MM/yyyy'"
            locale="pt-BR"
            :enable-time-picker="false"
            :auto-apply="true"
            :close-on-auto-apply="false"
            :input-class="'date-input'"
            :placeholder="'De (dd/mm/aaaa)'"
          />
          <Datepicker
            v-model="departureToPicker"
            :format="'dd/MM/yyyy'"
            locale="pt-BR"
            :enable-time-picker="false"
            :auto-apply="true"
            :close-on-auto-apply="false"
            :input-class="'date-input'"
            :placeholder="'Até (dd/mm/aaaa)'"
            :min-date="departureFromPicker ?? today"
          />
        </div>
      </div>
      <div class="range-filter">
        <span>Volta</span>
        <div class="range-inputs">
          <Datepicker
            v-model="returnFromPicker"
            :format="'dd/MM/yyyy'"
            locale="pt-BR"
            :enable-time-picker="false"
            :auto-apply="true"
            :close-on-auto-apply="false"
            :input-class="'date-input'"
            :placeholder="'De (dd/mm/aaaa)'"
          />
          <Datepicker
            v-model="returnToPicker"
            :format="'dd/MM/yyyy'"
            locale="pt-BR"
            :enable-time-picker="false"
            :auto-apply="true"
            :close-on-auto-apply="false"
            :input-class="'date-input'"
            :placeholder="'Até (dd/mm/aaaa)'"
            :min-date="returnFromPicker ?? today"
          />
        </div>
      </div>
      <div class="filters-actions">
        <button type="button" class="primary" @click="applyFilters">Aplicar filtros</button>
        <button type="button" class="ghost" @click="clearFilters">Limpar</button>
      </div>
    </section>

    <p v-if="localError" class="feedback error">{{ localError }}</p>
    <p v-if="localSuccess" class="feedback success">{{ localSuccess }}</p>

    <div v-if="travelStore.loading" class="loading">Carregando pedidos…</div>

    <div v-else class="table-wrapper">
      <table v-if="hasItems" class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Solicitante</th>
            <th v-if="canManage">Usuário</th>
            <th>Local</th>
            <th>Ida</th>
            <th>Volta</th>
            <th>Status</th>
            <th v-if="canManage">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in travelStore.items" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.requester_name }}</td>
            <td v-if="canManage">{{ item.user?.name ?? '—' }}</td>
            <td>{{ item.location_label || '—' }}</td>
            <td>{{ formatDateForDisplay(item.departure_date) }}</td>
            <td>{{ formatDateForDisplay(item.return_date) }}</td>
            <td>
              <span class="status" :class="item.status">{{ getStatusLabel(item.status) }}</span>
            </td>
            <td v-if="canManage" class="actions">
              <button
                v-for="nextStatus in statusActions[item.status]"
                :key="nextStatus"
                type="button"
                class="secondary"
                @click="handleStatusChange(item.id, nextStatus)"
              >
                {{ nextStatus === 'approved' ? 'Aprovar' : 'Cancelar' }}
              </button>
              <span v-if="statusActions[item.status].length === 0">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Nenhum pedido encontrado.</p>
      <div v-if="hasItems" class="pagination-bar">
        <div class="pagination-info">
          Página {{ pagination.currentPage }} de {{ pagination.lastPage }} · {{ pagination.total }} registros
        </div>
        <div class="pagination-controls">
          <label class="per-page">
            <span>Itens por página</span>
            <select :value="pagination.perPage" @change="handlePerPageChange">
              <option v-for="option in perPageOptions" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>
          <button type="button" class="ghost" :disabled="isFirstPage" @click="goToPreviousPage">
            Anterior
          </button>
          <span class="page-indicator">{{ pagination.currentPage }} / {{ pagination.lastPage }}</span>
          <button type="button" class="ghost" :disabled="isLastPage" @click="goToNextPage">
            Próxima
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.subtitle {
  color: #475569;
  margin-top: 0.35rem;
}

.filters {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  align-items: end;
}

.range-filter {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: 0.35rem;
}

.range-inputs {
  display: grid;
  gap: 0.6rem;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.filters-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.date-input {
  width: 100%;
  border: 1px solid #cbd5f5;
  border-radius: 0.75rem;
  padding: 0.65rem 0.9rem;
  font-size: 0.95rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  color: #1e293b;
  font-size: 0.9rem;
}

select,
input,
button {
  border-radius: 0.6rem;
  border: 1px solid #cbd5f5;
  padding: 0.7rem 0.9rem;
  font-size: 0.95rem;
  font-weight: 500;
}

input:focus,
select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.primary {
  border: none;
  background: #0ea5e9;
  color: #fff;
  cursor: pointer;
}

.primary:hover {
  box-shadow: 0 12px 30px -18px rgba(14, 165, 233, 0.85);
}

.secondary {
  border: none;
  background: #e2e8f0;
  color: #1f2937;
  cursor: pointer;
}

.secondary:hover {
  box-shadow: 0 10px 24px -18px rgba(148, 163, 184, 0.85);
}

.ghost {
  border: 1px solid #cbd5f5;
  background: transparent;
  color: #1f2937;
  cursor: pointer;
}

.ghost:hover {
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.45);
}

.table-wrapper {
  background: #fff;
  border-radius: 1rem;
  box-shadow: 0 25px 60px -35px rgba(15, 23, 42, 0.25);
  overflow: hidden;
}

.pagination-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.pagination-info {
  font-size: 0.9rem;
  color: #475569;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pagination-controls .per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #475569;
}

.pagination-controls .per-page select {
  border-radius: 0.6rem;
  padding: 0.35rem 0.6rem;
  border: 1px solid #cbd5f5;
}

.pagination-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-indicator {
  font-size: 0.9rem;
  color: #1f2937;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: 0.9rem 1.1rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.table thead {
  background: #eff6ff;
  color: #1d4ed8;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.status {
  border-radius: 9999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
  letter-spacing: 0.05em;
}

.status.requested {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.status.approved {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.status.cancelled {
  background: rgba(248, 113, 113, 0.2);
  color: #b91c1c;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.feedback {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-weight: 500;
}

.feedback.error {
  background: rgba(248, 113, 113, 0.15);
  color: #b91c1c;
}

.feedback.success {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.loading,
.empty {
  background: #fff;
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  color: #475569;
  box-shadow: 0 25px 60px -35px rgba(15, 23, 42, 0.25);
}
</style>
