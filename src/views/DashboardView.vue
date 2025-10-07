<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const displayName = computed(() => auth.user?.name ?? 'Usuário');
const roleName = computed(() => {
  if (!auth.user) {
    return 'Sem função definida';
  }

  if (typeof auth.user.role === 'string' && auth.user.role.trim() !== '') {
    return auth.user.role;
  }

  if (Array.isArray(auth.user.roles) && auth.user.roles.length > 0) {
    return auth.user.roles[0];
  }

  return 'Sem função definida';
});

const goToCadastro = () => {
  router.push({ name: 'cadastrar' });
};

const logout = () => {
  auth.logout();
  router.replace({ name: 'login' });
};
</script>

<template>
  <main class="page">
    <section class="card">
      <header class="header">
        <div>
          <h1>Bem-vindo, {{ displayName }}.</h1>
          <p class="subtitle">Role atual: {{ roleName }}</p>
        </div>
        <button type="button" class="secondary" @click="logout">
          Sair
        </button>
      </header>

      <article class="content">
        <p>
          Você está autenticado e pode navegar para as áreas protegidas do
          sistema. Utilize os atalhos abaixo para acessar rapidamente as ações
          disponíveis.
        </p>

        <div class="actions">
          <button type="button" class="primary" @click="goToCadastro">
            Ir para Cadastro
          </button>
        </div>
      </article>
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
  align-items: flex-start;
}

.card {
  width: min(100%, 880px);
  background: #fff;
  border-radius: 1rem;
  padding: 2.75rem;
  box-shadow: 0 25px 60px -35px rgba(15, 23, 42, 0.45);
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.subtitle {
  color: #475569;
  margin-top: 0.35rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: #1e293b;
}

.actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

button {
  border: none;
  border-radius: 0.75rem;
  padding: 0.85rem 1.4rem;
  font-size: 1rem;
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
</style>
