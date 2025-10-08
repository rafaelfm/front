<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const userName = computed(() => auth.user?.name ?? 'Usuário');
const roleName = computed(() => {
  if (!auth.user) {
    return 'Sem função';
  }

  if (auth.user.role) {
    return auth.user.role;
  }

  if (Array.isArray(auth.user.roles) && auth.user.roles.length > 0) {
    return auth.user.roles[0];
  }

  return 'Sem função';
});

const links = [
  { to: { name: 'dashboard' }, label: 'Dashboard', icon: '📊' },
  { to: { name: 'cadastrar' }, label: 'Cadastrar Pedido', icon: '📝' },
];

const logout = () => {
  auth.logout();
  router.replace({ name: 'login' });
};
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-icon">✈️</span>
        <div class="brand-text">
          <strong>Viagens</strong>
          <small>Corporativas</small>
        </div>
      </div>

      <div class="user-card">
        <div class="avatar">{{ userName.charAt(0) }}</div>
        <div class="user-info">
          <span class="name">{{ userName }}</span>
          <span class="role">({{ roleName }})</span>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="link in links"
          :key="String(link.to.name)"
          :to="link.to"
          class="nav-item"
          :class="{ active: route.name === link.to.name }"
        >
          <span class="icon">{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </RouterLink>
      </nav>

      <button type="button" class="logout" @click="logout">
        Sair
      </button>
    </aside>

    <section class="content">
      <RouterView />
    </section>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #f8fafc;
  color: #0f172a;
}

.sidebar {
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  padding: 2rem 1.75rem;
  gap: 2rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.brand-icon {
  font-size: 1.8rem;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  background: rgba(15, 118, 110, 0.12);
  border-radius: 0.9rem;
  padding: 1rem;
}

.avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  background: rgba(37, 99, 235, 0.18);
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.user-info .name {
  font-weight: 600;
}

.user-info .role {
  font-size: 0.85rem;
  color: rgba(248, 250, 252, 0.75);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.7rem 0.9rem;
  border-radius: 0.75rem;
  color: rgba(248, 250, 252, 0.85);
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-item .icon {
  font-size: 1.2rem;
}

.nav-item:hover,
.nav-item.active {
  background: rgba(59, 130, 246, 0.22);
  color: #fff;
}

.logout {
  margin-top: auto;
  border: none;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  font-weight: 600;
  cursor: pointer;
  background: rgba(239, 68, 68, 0.18);
  color: #fecaca;
  transition: background 0.2s ease;
}

.logout:hover {
  background: rgba(239, 68, 68, 0.28);
}

.content {
  padding: 2.5rem;
  overflow-x: hidden;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .nav {
    flex-direction: row;
    gap: 0.75rem;
  }

  .logout {
    margin-top: 0;
  }
}
</style>
