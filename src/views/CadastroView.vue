<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch, watchEffect } from 'vue';
import Datepicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import { useTravelRequestsStore } from '../stores/travelRequests';
import { useAuthStore } from '../stores/auth';
import DestinationAutocomplete from '../components/DestinationAutocomplete.vue';
import { formatDateForDisplay, toApiDate } from '../lib/date';
import { getStatusLabel } from '../lib/status';
import type { Destination as AutocompleteDestination } from '../stores/destinations';

const travelStore = useTravelRequestsStore();
const auth = useAuthStore();

const form = reactive({
  requester_name: '',
  locationText: '',
  city_id: null as number | null,
  departure_date: '',
  return_date: '',
  notes: '',
});

const submitting = ref(false);
const localMessages = ref<string[]>([]);
const messageType = ref<'success' | 'error'>('success');
const selectedDestinationLabel = ref('');
let selectingDestination = false;
let selectingTimeout: ReturnType<typeof setTimeout> | null = null;

const today = new Date();
today.setHours(0, 0, 0, 0);

const departurePicker = ref<Date | null>(null);
const returnPicker = ref<Date | null>(null);

const userRequests = computed(() =>
  travelStore.items.filter((item) => item.status === 'requested'),
);

const handleDestinationSelected = ({
  destination,
  formatted,
}: {
  destination: AutocompleteDestination;
  formatted: string;
}) => {
  selectingDestination = true;
  form.city_id = Number(destination.city_id);
  selectedDestinationLabel.value = formatted.trim();

  if (messageType.value === 'error') {
    localMessages.value = [];
    messageType.value = 'success';
  }

  if (selectingTimeout !== null) {
    clearTimeout(selectingTimeout);
  }

  selectingTimeout = setTimeout(() => {
    selectingDestination = false;
    selectingTimeout = null;
  }, 0);
};

onBeforeUnmount(() => {
  if (selectingTimeout !== null) {
    clearTimeout(selectingTimeout);
    selectingTimeout = null;
  }
});

const resetForm = (options: { clearMessages?: boolean } = {}) => {
  form.requester_name = '';
  form.locationText = '';
  form.city_id = null;
  form.departure_date = '';
  form.return_date = '';
  form.notes = '';
  selectedDestinationLabel.value = '';
  selectingDestination = false;
  if (selectingTimeout !== null) {
    clearTimeout(selectingTimeout);
    selectingTimeout = null;
  }

  if (options.clearMessages) {
    localMessages.value = [];
    messageType.value = 'success';
  }
};

watch(
  () => form.departure_date,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = departurePicker.value ? toApiDate(departurePicker.value) : null;

    if (iso !== currentIso) {
      departurePicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(
  () => form.return_date,
  (value) => {
    const iso = toApiDate(value);
    const currentIso = returnPicker.value ? toApiDate(returnPicker.value) : null;

    if (iso !== currentIso) {
      returnPicker.value = iso ? new Date(iso) : null;
    }
  },
  { immediate: true },
);

watch(departurePicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== form.departure_date) {
    form.departure_date = iso;
  }
});

watch(returnPicker, (value) => {
  const iso = toApiDate(value ?? null) ?? '';

  if (iso !== form.return_date) {
    form.return_date = iso;
  }
});

const submit = async () => {
  if (submitting.value) {
    return;
  }

  const rawCityId = form.city_id;
  const cityId = typeof rawCityId === 'string' ? Number(rawCityId) : rawCityId;

  if (!Number.isFinite(cityId) || Number(cityId) <= 0) {
    messageType.value = 'error';
    localMessages.value = ['Selecione um destino válido.'];
    return;
  }

  submitting.value = true;
  localMessages.value = [];

  try {
    await travelStore.create({
      requester_name: form.requester_name,
      city_id: Number(cityId),
      departure_date: form.departure_date,
      return_date: form.return_date,
      notes: form.notes,
    });

    resetForm();
    messageType.value = 'success';
    localMessages.value = ['Pedido de viagem criado com sucesso!'];
    await travelStore.fetch();
  } catch (error) {
    messageType.value = 'error';
    const messages =
      typeof error === 'object' &&
      error !== null &&
      'messages' in error &&
      Array.isArray((error as { messages?: unknown }).messages)
        ? ((error as { messages?: unknown }).messages as unknown[])
            .map((item) => (typeof item === 'string' ? item : String(item)))
            .filter((message) => message.trim() !== '')
        : [];

    if (messages.length > 0) {
      localMessages.value = messages;
    } else {
      const fallback =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : 'Não foi possível criar o pedido.';
      localMessages.value = [fallback];
    }
  } finally {
    submitting.value = false;
  }
};

onMounted(() => {
  if (!travelStore.items.length) {
    travelStore.fetch().catch(() => {});
  }
});

watchEffect(() => {
  if (!form.requester_name && travelStore.error === '' && auth.user?.name) {
    form.requester_name = auth.user.name;
  }
});

watch(
  () => form.locationText,
  (value) => {
    if (selectingDestination) {
      return;
    }

    const normalizedCurrent = (value ?? '').trim();
    const normalizedSelected = selectedDestinationLabel.value.trim();

    if (normalizedCurrent === '') {
      form.city_id = null;
      selectedDestinationLabel.value = '';
      return;
    }

    if (normalizedCurrent !== normalizedSelected) {
      form.city_id = null;
    }
  },
);
</script>

<template>
  <main class="cadastro">
    <section class="card form-card">
      <header>
        <h1>Novo pedido de viagem</h1>
        <p class="subtitle">
          Preencha os dados abaixo para registrar uma nova solicitação de viagem.
        </p>
      </header>

      <form class="form" @submit.prevent="submit">
        <label>
          <span>Solicitante</span>
          <input v-model="form.requester_name" type="text" required placeholder="Nome completo" />
        </label>

<DestinationAutocomplete
  v-model="form.locationText"
  label="Local"
  placeholder="Cidade, estado ou país"
  required
  @selected="handleDestinationSelected"
/>

        <div class="grid">
          <label>
            <span>Data de ida</span>
            <Datepicker
              v-model="departurePicker"
              :format="'dd/MM/yyyy'"
              locale="pt-BR"
              :enable-time-picker="false"
              :auto-apply="true"
              :close-on-auto-apply="false"
              :input-class="'date-input'"
              :placeholder="'dd/mm/aaaa'"
              :min-date="today"
              required
            />
          </label>
          <label>
            <span>Data de volta</span>
            <Datepicker
              v-model="returnPicker"
              :format="'dd/MM/yyyy'"
              locale="pt-BR"
              :enable-time-picker="false"
              :auto-apply="true"
              :close-on-auto-apply="false"
              :input-class="'date-input'"
              :placeholder="'dd/mm/aaaa'"
              :min-date="departurePicker ?? today"
              required
            />
          </label>
        </div>

        <label>
          <span>Observações</span>
          <textarea v-model="form.notes" rows="3" placeholder="Informações adicionais"></textarea>
        </label>

        <div class="actions">
          <button type="submit" class="primary" :disabled="submitting">
            {{ submitting ? 'Enviando…' : 'Enviar pedido' }}
          </button>
          <button
            type="button"
            class="ghost"
            @click="() => resetForm({ clearMessages: true })"
          >
            Limpar
          </button>
        </div>
      </form>

      <div v-if="localMessages.length" class="feedback" :class="messageType">
        <ul>
          <li v-for="message in localMessages" :key="message">{{ message }}</li>
        </ul>
      </div>
    </section>

    <section class="card list-card">
      <header>
        <h2>Pedidos recentes</h2>
        <p class="subtitle">
          Acompanhe os pedidos solicitados recentemente. Utilize o painel principal
          para visualizar todos os pedidos e atualizar status.
        </p>
      </header>

      <div v-if="travelStore.loading" class="loading">Carregando pedidos…</div>
      <ul v-else class="list">
        <li v-for="item in travelStore.items" :key="item.id" class="list-item">
          <div>
            <strong>#{{ item.id }} – {{ item.location_label || '—' }}</strong>
            <p>
              {{ formatDateForDisplay(item.departure_date) }} →
              {{ formatDateForDisplay(item.return_date) }}
            </p>
          </div>
          <span class="status" :class="item.status">{{ getStatusLabel(item.status) }}</span>
        </li>
        <li v-if="!travelStore.items.length" class="empty">
          Nenhum pedido encontrado. Cadastre um novo para começar.
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.cadastro {
  display: grid;
  gap: 2rem;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  align-items: start;
}

.card {
  background: #fff;
  border-radius: 1rem;
  padding: 2.5rem;
  box-shadow: 0 20px 55px -40px rgba(15, 23, 42, 0.5);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subtitle {
  color: #475569;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

input,
textarea,
select {
  border: 1px solid #cbd5f5;
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
}

.date-input {
  width: 100%;
  border: 1px solid #cbd5f5;
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.date-input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

textarea {
  resize: vertical;
}

.actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

button {
  border-radius: 0.75rem;
  padding: 0.75rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.primary {
  border: none;
  background: #0ea5e9;
  color: #fff;
}

.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -18px rgba(14, 165, 233, 0.85);
}

.primary:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.ghost {
  border: 1px solid #cbd5f5;
  background: transparent;
  color: #1f2937;
}

.ghost:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.45);
}

.feedback {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-weight: 500;
}

.feedback ul {
  margin: 0;
  padding-left: 1.2rem;
}

.feedback li + li {
  margin-top: 0.35rem;
}

.feedback.success {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.feedback.error {
  background: rgba(248, 113, 113, 0.15);
  color: #b91c1c;
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 0.85rem;
  background: rgba(148, 163, 184, 0.12);
}

.status {
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  padding: 0.35rem 0.75rem;
  letter-spacing: 0.06em;
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

.loading,
.empty {
  text-align: center;
  color: #475569;
}
</style>
