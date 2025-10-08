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
const filterFromPicker = ref<Date | null>(null);
const filterToPicker = ref<Date | null>(null);
const today = new Date();
today.setHours(0, 0, 0, 0);

const fetchData = async () => {
  try {
    await travelStore.fetch();
    localError.value = '';
  } catch (error) {
    localError.value =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : 'Falha ao carregar os pedidos.';
  }
};

onMounted(() => {
  fetchData().catch(() => {});
});

watch(
  () => travelStore.filters.from,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = filterFromPicker.value ? toApiDate(filterFromPicker.value) : null;

    if (iso !== currentIso) {
      filterFromPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(
  () => travelStore.filters.to,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = filterToPicker.value ? toApiDate(filterToPicker.value) : null;

    if (iso !== currentIso) {
      filterToPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(filterFromPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== travelStore.filters.from) {
    travelStore.filters.from = iso;
  }
});

watch(filterToPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== travelStore.filters.to) {
    travelStore.filters.to = iso;
  }
});

watch(
  () => [
    travelStore.filters.status,
    travelStore.filters.destination,
    travelStore.filters.from,
    travelStore.filters.to,
  ],
  () => {
    fetchData().catch(() => {});
  },
);

const handleStatusChange = async (id: number, status: TravelStatus) => {
  localError.value = '';
  localSuccess.value = '';

  try {
    await travelStore.updateStatus(id, status);
    localSuccess.value = 'Status atualizado com sucesso.';
    await fetchData();
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
</script>

<template>
  <main class="dashboard">
    <header class="hero">
      <div>
        <h1>Bem-vindo, {{ displayName }}.</h1>
        <p class="subtitle">Role atual: {{ roleName }}</p>
      </div>
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
      <DestinationAutocomplete
        v-model="travelStore.filters.destination"
        label="Destino"
        placeholder="Ex: São Paulo"
      />
      <label>
        <span>Data inicial</span>
        <Datepicker
          v-model="filterFromPicker"
          :format="'dd/MM/yyyy'"
          locale="pt-BR"
          :enable-time-picker="false"
          :auto-apply="true"
          :close-on-auto-apply="false"
          :input-class="'date-input'"
          :placeholder="'dd/mm/aaaa'"
        />
      </label>
      <label>
        <span>Data final</span>
        <Datepicker
          v-model="filterToPicker"
          :format="'dd/MM/yyyy'"
          locale="pt-BR"
          :enable-time-picker="false"
          :auto-apply="true"
          :close-on-auto-apply="false"
          :input-class="'date-input'"
          :placeholder="'dd/mm/aaaa'"
          :min-date="filterFromPicker ?? today"
        />
      </label>
      <button type="button" class="ghost" @click="travelStore.resetFilters">Limpar</button>
    </section>

    <p v-if="localError" class="feedback error">{{ localError }}</p>
    <p v-if="localSuccess" class="feedback success">{{ localSuccess }}</p>

    <div v-if="travelStore.loading" class="loading">Carregando pedidos…</div>

    <div v-else class="table-wrapper">
      <table v-if="travelStore.filtered.length" class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Solicitante</th>
            <th>Destino</th>
            <th>Ida</th>
            <th>Volta</th>
            <th>Status</th>
            <th v-if="canManage">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in travelStore.filtered" :key="item.id">
            <td>{{ item.id }}</td>
            <td>{{ item.requester_name }}</td>
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  align-items: end;
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
