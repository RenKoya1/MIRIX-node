<p align="center">
  <img src="../MIRIX/assets/logo.png" alt="Mirix Logo" width="200">
</p>

# MIRIX-node

**Multi-Agent Personal Assistant with an Advanced Memory System - TypeScript Edition**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-6.0-black.svg)](https://sdk.vercel.ai/)
[![Hono](https://img.shields.io/badge/Hono-4.7-orange.svg)](https://hono.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.3-teal.svg)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-Apache%202.0-green.svg)](LICENSE)

---

## 📖 Overview

MIRIX-node is a TypeScript port of [MIRIX](https://github.com/Mirix-AI/MIRIX), originally written in Python.
It provides a multi-agent architecture with six specialized memory systems (Core, Episodic, Semantic, Procedural, Resource, Knowledge) that mimic human memory structures.

## ✨ Key Features

- 🤖 **Multi-Provider LLM Integration** - Unified access to OpenAI, Anthropic, and Google AI via Vercel AI SDK
- 🧠 **6 Memory Systems** - Advanced memory management mimicking human cognitive structures
- 🔧 **Tool Execution Sandbox** - Secure sandboxed environment for tool execution
- 🚀 **High-Performance REST API** - Fast API server powered by Hono framework
- 💾 **Hybrid Caching** - Intelligent caching with Redis Hash + JSON
- 🔍 **Vector Search** - Semantic search using embedding vectors
- ⚡ **Background Jobs** - Asynchronous memory processing queue

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         REST API (Hono)                         │
├─────────────────────────────────────────────────────────────────┤
│                         Agent Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  MirixAgent  │  │  BaseAgent   │  │  AgentState  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                       Services Layer                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ AgentManager │ UserManager │ BlockManager │ MessageManager │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │     Memory Managers (Episodic, Semantic, Procedural,       │ │
│  │                Resource, Knowledge)                         │ │
│  └────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                      Tools & Functions                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ ToolRegistry │  │   Sandbox    │  │  RuleSolver  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                        LLM Layer                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Vercel AI SDK (ai, @ai-sdk/*)               │   │
│  │   OpenAI  │  Anthropic  │  Google AI  │  Azure OpenAI    │   │
│  └──────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                      Database Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Prisma    │  │    Redis     │  │ Redis Search │          │
│  │  (Postgres)  │  │   (Cache)    │  │  (Vectors)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Installation

```bash
# Clone
git clone <repository-url>
cd mirix_migration/MIRIX-node

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env to set API keys and other settings

# Setup database
npm run db:generate
npm run db:push
```

---

## 🚀 Quick Start

### Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm run start
```

---

## ⚙️ Environment Variables

```env
# LLM API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mirix

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=8531
NODE_ENV=development

# Logging
LOG_LEVEL=info
```

---

## 📚 Usage Examples

### LLM Client

```typescript
import { llm, createLLMClient, createDefaultLLMConfig } from 'mirix-node';

// Quick usage
const model = llm.openai('gpt-4o-mini');

// Configuration-based client
const config = createDefaultLLMConfig('gpt-4o-mini');
const client = createLLMClient(config);

// Text generation
const result = await client.generate('Hello, world!', {
  system: 'You are a helpful assistant.',
});
console.log(result.text);

// Structured output
import { z } from 'zod';

const structured = await client.generateStructured(
  'Extract name and age from: John is 25 years old.',
  z.object({
    name: z.string(),
    age: z.number(),
  })
);
console.log(structured.object); // { name: 'John', age: 25 }

// Streaming
const stream = await client.stream('Tell me a story...');
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Agent

```typescript
import { createAgent, agentManager, prisma } from 'mirix-node';

// Create an agent
const agent = await agentManager.create({
  name: 'My Assistant',
  description: 'A helpful personal assistant',
  organizationId: 'org-xxx',
  llmConfig: createDefaultLLMConfig('gpt-4o'),
});

// Execute agent
const mirixAgent = await createAgent(agent);
const result = await mirixAgent.step('Hello! What can you help me with?');
console.log(result.message);
```

### Redis Cache

```typescript
import { getRedisClient, RedisMemoryClient } from 'mirix-node';

const redis = getRedisClient();

// Entity caching
await redis.cacheAgent('agent-123', { name: 'My Agent', ... });
const cached = await redis.getAgent('agent-123');

// Memory caching (with embedding vector support)
await redis.cacheMemory('episodic', 'mem-123', {
  content: 'User mentioned they like coffee',
  embedding: [0.1, 0.2, ...],
  ...
});
```

### REST API

```typescript
import { createApp, startServer } from 'mirix-node';

const app = createApp();
await startServer(app, 8531);

// Endpoints:
// GET  /health
// GET  /api/v1/agents
// POST /api/v1/agents
// GET  /api/v1/agents/:id
// PUT  /api/v1/agents/:id
// DELETE /api/v1/agents/:id
// POST /api/v1/agents/:id/messages
// GET  /api/v1/messages
```

---

## 🧪 Testing

```bash
# Run tests
npm test

# Single run
npm run test:run

# Coverage
npm run test -- --coverage
```

---

## 📁 Project Structure

```
MIRIX-node/
├── src/
│   ├── agent/              # Agent core
│   │   ├── agent.ts        # MirixAgent class
│   │   ├── base-agent.ts   # Base agent class
│   │   └── agent-state.ts  # Agent state management
│   │
│   ├── database/           # Database layer
│   │   ├── prisma-client.ts    # Prisma client
│   │   ├── redis-client.ts     # Redis hybrid cache
│   │   ├── redis-search.ts     # Redis vector search
│   │   └── middleware.ts       # Database middleware
│   │
│   ├── llm_api/            # LLM integration (Vercel AI SDK)
│   │   └── client.ts       # Unified LLM client
│   │
│   ├── queue/              # Background jobs
│   │   ├── manager.ts      # Queue manager
│   │   ├── worker.ts       # Job worker
│   │   └── memory-processor.ts # Memory processing
│   │
│   ├── schemas/            # Zod schemas
│   │   ├── enums.ts        # Enumerations
│   │   ├── llm_config.ts   # LLM configuration
│   │   └── mirix_message.ts # Message schemas
│   │
│   ├── server/             # REST API (Hono)
│   │   ├── app.ts          # Hono app
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Middleware
│   │
│   ├── services/           # Business logic
│   │   ├── agent-manager.ts
│   │   ├── user-manager.ts
│   │   ├── message-manager.ts
│   │   └── memory/         # Memory managers
│   │
│   ├── tools/              # Tool system
│   │   ├── registry.ts     # Tool registry
│   │   ├── sandbox.ts      # Sandbox execution
│   │   └── core/           # Core tools
│   │
│   ├── errors.ts           # Custom errors
│   ├── log.ts              # Pino logger
│   └── index.ts            # Entry point
│
├── prisma/
│   └── schema.prisma       # Prisma schema
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Language | TypeScript 5.7 |
| Runtime | Node.js 20+ |
| LLM | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`) |
| Web Framework | Hono |
| ORM | Prisma |
| Cache | Redis (ioredis) |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest |
| Sandbox | vm2 |

---

## 🔧 NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (hot reload) |
| `npm run build` | Build TypeScript |
| `npm run start` | Start production server |
| `npm run typecheck` | Type checking |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |
| `npm test` | Run tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create and apply migrations |
| `npm run db:studio` | Open Prisma Studio |

---

## 📄 License

Apache License 2.0

---

## 🔗 Related Links

- [Original MIRIX (Python)](https://github.com/Mirix-AI/MIRIX)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Hono](https://hono.dev/)
- [Prisma](https://www.prisma.io/)

---

## 👥 Contributing

Issues and Pull Requests are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
