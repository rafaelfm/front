# Front-end – Portal de Viagens Corporativas

SPA desenvolvida com Vue 3 + Vite que consome a API Laravel para gerenciar pedidos de viagem corporativa. A aplicação utiliza Pinia para gerenciamento de estado, Vue Router para navegação protegida e Axios com interceptores para anexar o JWT em todas as requisições.

## Requisitos

- Node.js 20+
- npm 10+
- API em execução (ver diretório `back/`)

## Instalação

```bash
cd front
npm install
```

## Executando em modo desenvolvimento

O front-end é servido via Nginx na porta `91` quando utilizando o `docker-compose`. Em execução local:

```bash
npm run dev
```

Acesse `http://localhost:5173` (ou `http://localhost:91` quando por trás do Nginx). O cliente utiliza a mesma origem para montar as rotas `/api`, portanto não é necessário configurar `VITE_API_BASE_URL` quando a API está sendo servida pelo mesmo host.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o Vite em modo desenvolvimento. |
| `npm run build` | Gera build de produção. |
| `npm run preview` | Previsualiza o build gerado. |

## Autenticação e Fluxo

1. Tela de login (`/login` ou `/` – alias) consome `POST /api/login`.
2. O token é armazenado em `jwt` (cookie com `SameSite=Lax`) e mantido no estado do Pinia (`auth` store).
3. Rotas protegidas (`/dashboard`, `/cadastrar`) usam guardas globais para validar o token, reidratando a sessão via `GET /api/user`.
4. Interceptores do Axios redirecionam para o login se a API responder `401`/`403`.

## Layout

- **Sidebar responsiva** com atalhos para Dashboard e Cadastro.
- **Dashboard**: tabela com filtros (status, destino, período) e ações de aprovação/cancelamento disponíveis apenas para administradores.
- **Cadastro**: formulário para criar novos pedidos, com feedback em tempo real e listagem dos pedidos recentes do usuário.

## Estado Global

- `stores/auth.ts`: cuida do JWT, usuário autenticado, banners de sessão e restaurar token do cookie.
- `stores/travelRequests.ts`: centraliza filtros, paginação, criação/listagem e atualização de status dos pedidos.

## Feedback ao Usuário

- Banner global no topo para mensagens de sessão.
- Feedback contextual (sucesso/erro) em dashboard e formulário de cadastro.
- Indicadores de loading exibidos durante chamadas assíncronas.

## Ajustes de Permissão no Front

A visibilidade das ações do dashboard é baseada nos dados retornados pelo backend (`user.role` / `user.roles`). Usuários sem permissão de gerenciamento enxergam apenas seus próprios pedidos e não visualizam botões de alteração de status.

## Testes

Testes unitários/integração podem ser adicionados com `vitest` ou `cypress`. No momento não há suites configuradas — priorize o fluxo manual:

1. Login com `admin@gmail.com` / `admin@gmail.com`.
2. Criar pedido via `/cadastrar`.
3. Validar filtros e atualização de status via `/dashboard`.
4. Fazer logout pelo menu lateral ou expirando o token.

## Deploy

Execute `npm run build`. O diretório `dist/` pode ser servido por qualquer CDN ou integrado ao Nginx. Lembre-se de apontar `/api` para o backend Laravel.
