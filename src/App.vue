<script setup lang="ts">
import { RouterView } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from './stores/auth';

const auth = useAuthStore();
const { statusMessage } = storeToRefs(auth);

const clearBanner = () => {
  auth.setStatusMessage('');
};
</script>

<template>
  <div class="app-shell">
    <transition name="fade">
      <div v-if="statusMessage" class="status-banner" role="alert">
        <span>{{ statusMessage }}</span>
        <button type="button" @click="clearBanner">Fechar</button>
      </div>
    </transition>

    <RouterView />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.status-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: #1d4ed8;
  color: #fff;
  padding: 0.75rem 1rem;
}

.status-banner button {
  border: none;
  background: rgba(255, 255, 255, 0.85);
  color: #1e3a8a;
  border-radius: 0.5rem;
  padding: 0.25rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.status-banner button:hover {
  background: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
