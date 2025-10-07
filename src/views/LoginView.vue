<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const form = reactive({
  email: '',
  password: '',
});

const submitting = ref(false);
const localMessage = ref('');

const dismissMessage = () => {
  localMessage.value = '';
  auth.setStatusMessage('');
};

watch(
  () => route.query.reason,
  (reason) => {
    if (reason === 'expired') {
      localMessage.value =
        auth.statusMessage || 'Sessão expirada. Faça login novamente.';
    }
  },
  { immediate: true },
);

watch(
  () => auth.statusMessage,
  (status) => {
    if (status) {
      localMessage.value = status;
    }
  },
);

const formDisabled = computed(() => submitting.value || auth.loading);

const handleSubmit = async () => {
  if (formDisabled.value) {
    return;
  }

  submitting.value = true;
  localMessage.value = '';
  auth.setStatusMessage('');

  try {
    await auth.login({ email: form.email, password: form.password });

    const target = auth.redirectPath ?? '/dashboard';
    auth.setRedirectPath(null);
    auth.setStatusMessage('');

    await router.replace(target);
  } catch (error) {
    const message =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message)
        : 'Não foi possível realizar o login.';

    localMessage.value = message;
    auth.setStatusMessage(message);
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <main class="page">
    <section class="card">
      <h1>Login</h1>
      <p class="subtitle">
        Faça login para acessar o painel administrativo.
      </p>

      <form class="form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>E-mail</span>
          <input
            v-model="form.email"
            type="email"
            autocomplete="email"
            placeholder="seu-email@exemplo.com"
            required
          />
        </label>

        <label class="field">
          <span>Senha</span>
          <input
            v-model="form.password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>

        <button type="submit" :disabled="formDisabled">
          {{ formDisabled ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>

      <p v-if="localMessage" class="feedback">
        {{ localMessage }}
        <button type="button" @click="dismissMessage">Fechar</button>
      </p>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  background: #f1f5f9;
  color: #0f172a;
}

.card {
  width: min(100%, 420px);
  background: #fff;
  border-radius: 0.75rem;
  box-shadow: 0 20px 45px -25px rgba(15, 23, 42, 0.45);
  padding: 2.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.subtitle {
  color: #475569;
  font-size: 0.95rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.95rem;
}

input {
  border: 1px solid #cbd5f5;
  border-radius: 0.6rem;
  padding: 0.75rem 0.9rem;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}

button[type='submit'] {
  border: none;
  border-radius: 0.6rem;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
  background: #4f46e5;
  color: #fff;
}

button[type='submit']:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 12px 30px -18px rgba(79, 70, 229, 0.85);
}

button[type='submit']:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.feedback {
  margin: 0;
  color: #1d4ed8;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.feedback button {
  border: none;
  background: transparent;
  color: #1d4ed8;
  font-weight: 600;
  cursor: pointer;
}
</style>
