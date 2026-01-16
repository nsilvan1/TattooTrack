# Guia de Desenvolvimento Local - TattooTrack

## Pré-requisitos

- Node.js (v18+)
- npm ou yarn
- Vercel CLI (para modo Vercel)

## Opção 1: Modo Vercel (Recomendado)

Este modo simula o ambiente de produção da Vercel, incluindo as funções serverless da API.

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Fazer login na Vercel

```bash
vercel login
```

### 3. Configurar variáveis de ambiente

No arquivo `frontend/.env`:

```env
VITE_API_BASE_URL=
VITE_API_URL=/api
```

### 4. Iniciar o projeto

```bash
cd frontend
vercel dev --yes
```

O projeto estará disponível em: **http://localhost:3000**

---

## Opção 2: Modo Local (Frontend + Backend separados)

Este modo roda o frontend e backend como serviços independentes.

### 1. Configurar variáveis de ambiente

**Frontend** (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:3333
VITE_API_URL=http://localhost:3333/api
```

**Backend** (`backend/.env`):

```env
DATABASE_URL="sua_url_do_banco"
JWT_SECRET="seu_secret"
PORT=3333
```

### 2. Instalar dependências

```bash
# Terminal 1 - Backend
cd backend
npm install

# Terminal 2 - Frontend
cd frontend
npm install
```

### 3. Iniciar o Backend

```bash
cd backend
npm run dev
```

O backend estará disponível em: **http://localhost:3333**

### 4. Iniciar o Frontend

```bash
cd frontend
npm run dev
```

O frontend estará disponível em: **http://localhost:5173**

---

## Comandos Úteis

### Backend

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:push` | Sincroniza schema com o banco |
| `npm run db:migrate` | Executa migrations |
| `npm run db:seed` | Popula o banco com dados iniciais |

### Frontend

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento |
| `npm run build` | Compila para produção |
| `npm run preview` | Preview do build de produção |
| `npm run lint` | Executa o linter |

---

## Qual modo escolher?

| Cenário | Modo Recomendado |
|---------|------------------|
| Testar antes de deploy na Vercel | Vercel (`vercel dev`) |
| Desenvolvimento de funções serverless | Vercel (`vercel dev`) |
| Debug do backend com mais controle | Local (separado) |
| Ambiente sem conta Vercel | Local (separado) |
