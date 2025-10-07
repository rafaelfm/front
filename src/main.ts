import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { setupApiInterceptors } from './lib/api';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const auth = useAuthStore(pinia);

setupApiInterceptors(auth, router);

auth
  .hydrate()
  .catch((error) => {
    console.error('Falha ao restaurar a sessão:', error);
  })
  .finally(() => {
    app.mount('#app');
  });
