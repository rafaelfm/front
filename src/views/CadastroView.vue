<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from 'vue';
import { useTravelRequestsStore } from '../stores/travelRequests';
import { useAuthStore } from '../stores/auth';
import DestinationAutocomplete from '../components/DestinationAutocomplete.vue';

const travelStore = useTravelRequestsStore();
const auth = useAuthStore();

const form = reactive({
  requester_name: '',
  destination: '',
  departure_date: '',
  return_date: '',
  notes: '',
});

const submitting = ref(false);
const localMessage = ref('');
const messageType = ref<'success' | 'error'>('success');

const userRequests = computed(() =>
  travelStore.items.filter((item) => item.status === 'requested'),
);

const resetForm = () => {
  form.requester_name = '';
  form.destination = '';
  form.departure_date = '';
  form.return_date = '';
  form.notes = '';
};

const submit = async () => {
  if (submitting.value) {
    return;
  }

  submitting.value = true;
  localMessage.value = '';

  try {
    await travelStore.create({
      requester_name: form.requester_name,
      destination: form.destination,
      departure_date: form.departure_date,
      return_date: form.return_date,
      notes: form.notes,
    });

    messageType.value = 'success';
    localMessage.value = 'Pedido de viagem criado com sucesso!';
    resetForm();
    await travelStore.fetch();
  } catch (error) {
    messageType.value = 'error';
    localMessage.value =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : 'Não foi possível criar o pedido.';
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
          v-model="form.destination"
          label="Destino"
          placeholder="Cidade, País"
          required
        />

        <div class="grid">
          <label>
            <span>Data de ida</span>
            <input v-model="form.departure_date" type="date" required />
          </label>
          <label>
            <span>Data de volta</span>
            <input v-model="form.return_date" type="date" required />
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
          <button type="button" class="ghost" @click="resetForm">Limpar</button>
        </div>
      </form>

      <p v-if="localMessage" class="feedback" :class="messageType">{{ localMessage }}</p>
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
            <strong>#{{ item.id }} – {{ item.destination }}</strong>
            <p>
              {{ new Date(item.departure_date).toLocaleDateString() }} →
              {{ new Date(item.return_date).toLocaleDateString() }}
            </p>
          </div>
          <span class="status" :class="item.status">{{ item.status }}</span>
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
