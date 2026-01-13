# TattooTrack

Sistema completo de gerenciamento para tatuadores. Gerencie clientes, agendamentos, finanças e integre com o Google Calendar.

## Funcionalidades

- **Autenticação** - Registro e login com JWT
- **Gestão de Clientes** - CRUD completo com tags, notas médicas e alergias
- **Agendamentos** - Calendário mensal com controle de depósitos e status
- **Finanças** - Controle de receitas e despesas por categoria
- **Google Calendar** - Sincronização bidirecional de agendamentos

## Tech Stack

### Backend
- Node.js + Express 5
- TypeScript
- MongoDB + Prisma ORM
- JWT + bcrypt
- Zod (validação)
- Google APIs (OAuth2 + Calendar)

### Frontend
- React 19 + TypeScript
- Vite
- React Router DOM
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS
- Lucide Icons

## Pré-requisitos

- Node.js v18+
- MongoDB (local ou [MongoDB Atlas](https://www.mongodb.com/atlas))
- Conta Google Cloud (para integração com Calendar)

## Configuração

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/TattooTrack.git
cd TattooTrack
```

### 2. Instale as dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure as variáveis de ambiente

**Backend** - Crie `backend/.env`:

```env
PORT=3333
DATABASE_URL=mongodb+srv://usuario:senha@cluster.mongodb.net/tattootrack
JWT_SECRET=sua_chave_secreta_aqui
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3333/api/auth/google/callback
```

**Frontend** - Crie `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3333
VITE_API_URL=http://localhost:3333/api
```

### 4. Configure o banco de dados

```bash
cd backend
npm run db:push    # Aplica o schema no MongoDB
npm run db:seed    # (Opcional) Popula com dados de exemplo
```

## Executando

### Desenvolvimento

Abra dois terminais:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Rodando em http://localhost:3333
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Rodando em http://localhost:5173
```

Acesse: http://localhost:5173

### Produção

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm run preview
```

## Estrutura do Projeto

```
TattooTrack/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Entrada do Express
│   │   ├── routes/           # Endpoints da API
│   │   │   ├── auth.ts       # Autenticação + Google OAuth
│   │   │   ├── clients.ts
│   │   │   ├── appointments.ts
│   │   │   ├── tags.ts
│   │   │   ├── tattoos.ts
│   │   │   ├── references.ts
│   │   │   └── upload.ts
│   │   └── middlewares/
│   └── prisma/
│       ├── schema.prisma     # Modelos do banco
│       └── seed.ts
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Páginas da aplicação
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clients.tsx
│   │   │   ├── Appointments.tsx
│   │   │   ├── Finances.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/       # Componentes reutilizáveis
│   │   ├── services/         # Chamadas à API
│   │   ├── contexts/         # AuthContext
│   │   └── utils/
│   └── api/
│       └── index.ts          # Handler serverless (Vercel)
│
└── vercel.json               # Configuração de deploy
```

## API Endpoints

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Registrar usuário |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Usuário atual |
| GET | `/api/auth/google/connect` | Iniciar OAuth Google |
| POST | `/api/auth/google/sync` | Sincronizar Google Calendar |

### Recursos
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET/POST | `/api/clients` | Listar/Criar clientes |
| GET/PUT/DELETE | `/api/clients/:id` | Cliente específico |
| GET/POST | `/api/appointments` | Listar/Criar agendamentos |
| GET/POST | `/api/tags` | Listar/Criar tags |
| GET | `/api/finances/summary` | Resumo financeiro |

## Deploy (Vercel)

O projeto está configurado para deploy unificado na Vercel:

1. Conecte o repositório GitHub na Vercel
2. Configure as variáveis de ambiente no dashboard
3. A Vercel automaticamente:
   - Faz build do frontend para CDN
   - Deploy do backend como serverless functions em `/api`

### Variáveis de ambiente (Vercel)
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (atualizar para URL de produção)

## Configuração Google OAuth

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um projeto ou selecione existente
3. Ative a **Google Calendar API**
4. Em **Credenciais**, crie um **OAuth 2.0 Client ID**
5. Configure as URIs de redirecionamento:
   - Desenvolvimento: `http://localhost:3333/api/auth/google/callback`
   - Produção: `https://seu-dominio.vercel.app/api/auth/google/callback`
6. Copie o Client ID e Client Secret para as variáveis de ambiente

## Scripts

### Backend
| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia servidor de desenvolvimento |
| `npm run build` | Compila TypeScript |
| `npm start` | Inicia servidor de produção |
| `npm run db:push` | Aplica schema no banco |
| `npm run db:seed` | Popula banco com dados |

### Frontend
| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Executa ESLint |

## Licença

MIT
