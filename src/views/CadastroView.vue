<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

interface CadastroItem {
  id: number;
  nome: string;
  descricao: string;
  categoria: string;
  criadoEm: string;
}

const STORAGE_KEY = 'app-cadastro-itens';

const auth = useAuthStore();
const router = useRouter();

const items = ref<CadastroItem[]>([]);
const search = ref('');
const editingId = ref<number | null>(null);
const form = reactive({
  nome: '',
  descricao: '',
  categoria: 'Geral',
});

const filteredItems = computed(() => {
  if (!search.value) {
    return items.value;
  }

  const term = search.value.toLowerCase();
  return items.value.filter((item) =>
    [item.nome, item.descricao, item.categoria]
      .join(' ')
      .toLowerCase()
      .includes(term),
  );
});

const isEditing = computed(() => editingId.value !== null);

const resetForm = () => {
  form.nome = '';
  form.descricao = '';
  form.categoria = 'Geral';
  editingId.value = null;
};

const loadItems = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw) as CadastroItem[];
    if (Array.isArray(parsed)) {
      items.value = parsed;
    }
  } catch (error) {
    console.warn('Não foi possível carregar os itens:', error);
  }
};

const persistItems = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.value));
};

watch(
  () => items.value,
  () => {
    persistItems();
  },
  { deep: true },
);

const handleSubmit = () => {
  if (!form.nome.trim()) {
    return;
  }

  const timestamp = new Date().toISOString();

  if (editingId.value !== null) {
    items.value = items.value.map((item) =>
      item.id === editingId.value
        ? {
            ...item,
            nome: form.nome.trim(),
            descricao: form.descricao.trim(),
            categoria: form.categoria,
          }
        : item,
    );
  } else {
    const newItem: CadastroItem = {
      id: Date.now(),
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      criadoEm: timestamp,
    };

    items.value = [newItem, ...items.value];
  }

  resetForm();
};

const handleEdit = (item: CadastroItem) => {
  editingId.value = item.id;
  form.nome = item.nome;
  form.descricao = item.descricao;
  form.categoria = item.categoria;
};

const handleDelete = (id: number) => {
  items.value = items.value.filter((item) => item.id !== id);

  if (editingId.value === id) {
    resetForm();
  }
};

const goBack = () => {
  router.push({ name: 'dashboard' });
};

const logout = () => {
  auth.logout();
  router.replace({ name: 'login' });
};

onMounted(() => {
  loadItems();
});
</script>

<template>
  <main class="page">
    <section class="card">
      <header class="header">
        <div>
          <h1>Cadastro de Registros</h1>
          <p class="subtitle">
            Gerencie seus itens cadastrados. Utilize a pesquisa para encontrar
            rapidamente qualquer registro.
          </p>
        </div>
        <div class="header-actions">
          <button type="button" class="secondary" @click="goBack">
            Voltar para Dashboard
          </button>
          <button type="button" class="secondary" @click="logout">
            Sair
          </button>
        </div>
      </header>

      <section class="form-section">
        <h2>{{ isEditing ? 'Editar registro' : 'Novo registro' }}</h2>
        <form class="form" @submit.prevent="handleSubmit">
          <label class="field">
            <span>Nome</span>
            <input
              v-model="form.nome"
              type="text"
              required
              placeholder="Nome do item"
            />
          </label>

          <label class="field">
            <span>Descrição</span>
            <textarea
              v-model="form.descricao"
              rows="3"
              placeholder="Descrição detalhada"
            ></textarea>
          </label>

          <label class="field">
            <span>Categoria</span>
            <select v-model="form.categoria">
              <option value="Geral">Geral</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Operacional">Operacional</option>
              <option value="Outros">Outros</option>
            </select>
          </label>

          <div class="form-actions">
            <button type="submit" class="primary">
              {{ isEditing ? 'Salvar alterações' : 'Adicionar registro' }}
            </button>
            <button type="button" class="ghost" @click="resetForm">
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section class="list-section">
        <header class="list-header">
          <h2>Itens cadastrados</h2>
          <input
            v-model="search"
            type="search"
            placeholder="Pesquisar por nome, descrição ou categoria"
          />
        </header>

        <table class="table" v-if="filteredItems.length">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="item.id">
              <td>{{ item.nome }}</td>
              <td>{{ item.descricao || '—' }}</td>
              <td>{{ item.categoria }}</td>
              <td>{{ new Date(item.criadoEm).toLocaleString() }}</td>
              <td class="table-actions">
                <button type="button" class="secondary" @click="handleEdit(item)">
                  Editar
                </button>
                <button type="button" class="danger" @click="handleDelete(item.id)">
                  Excluir
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <p v-else class="empty">Nenhum registro encontrado.</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f1f5f9;
  padding: 2.5rem 1rem;
  display: flex;
  justify-content: center;
}

.card {
  width: min(100%, 1100px);
  background: #fff;
  border-radius: 1rem;
  padding: 2.75rem;
  box-shadow: 0 25px 60px -35px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.subtitle {
  color: #475569;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form {
  display: grid;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

input,
textarea,
select {
  border: 1px solid #cbd5f5;
  border-radius: 0.6rem;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

button {
  border: none;
  border-radius: 0.75rem;
  padding: 0.75rem 1.3rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.primary {
  background: #0ea5e9;
  color: #fff;
}

.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -18px rgba(14, 165, 233, 0.85);
}

.secondary {
  background: #e2e8f0;
  color: #1f2937;
}

.secondary:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -18px rgba(148, 163, 184, 0.85);
}

.danger {
  background: #ef4444;
  color: #fff;
}

.danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -18px rgba(239, 68, 68, 0.85);
}

.ghost {
  background: transparent;
  border: 1px solid #cbd5f5;
  color: #1f2937;
}

.ghost:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -20px rgba(15, 23, 42, 0.45);
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.list-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.list-header input[type='search'] {
  width: min(100%, 320px);
}

.table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 0.75rem;
  overflow: hidden;
}

.table th,
.table td {
  padding: 0.85rem 1rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.table thead {
  background: #eff6ff;
  color: #1d4ed8;
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
}

.table-actions {
  display: flex;
  gap: 0.5rem;
}

.empty {
  text-align: center;
  color: #475569;
  padding: 1rem;
  border: 1px dashed #cbd5f5;
  border-radius: 0.75rem;
}

@media (max-width: 760px) {
  .table thead {
    display: none;
  }

  .table tr {
    display: grid;
    gap: 0.35rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid #e2e8f0;
  }

  .table td {
    border: none;
    padding: 0.35rem 0;
  }

  .table-actions {
    justify-content: flex-start;
  }
}
</style>
