import { createRouter, createWebHistory, type NavigationGuardNext, type RouteLocationNormalized } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      alias: '/',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('../layouts/ProtectedLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
        },
        {
          path: 'cadastrar',
          name: 'cadastrar',
          component: () => import('../views/CadastroView.vue'),
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

const handleAuthGuard = async (
  to: RouteLocationNormalized,
  next: NavigationGuardNext,
) => {
  const auth = useAuthStore();

  if (!auth.hydrated) {
    try {
      await auth.hydrate();
    } catch (error) {
      console.error('Erro ao hidratar a sessão:', error);
    }
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    auth.setRedirectPath(to.fullPath);
    if (!auth.statusMessage) {
      auth.setStatusMessage('Sessão expirada. Faça login novamente.');
    }

    return next({ name: 'login', query: { reason: 'expired' } });
  }

  if (to.meta.requiresGuest && auth.isAuthenticated) {
    return next({ name: 'dashboard' });
  }

  return next();
};

router.beforeEach(async (to, _from, next) => {
  await handleAuthGuard(to, next);
});

export default router;
