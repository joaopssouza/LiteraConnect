# ============================================================
# Stage 1: deps — instala APENAS dependências de produção
# ============================================================
FROM node:20-alpine AS deps
WORKDIR /app

# Copia apenas os arquivos de manifesto para aproveitar cache de camadas
COPY package.json package-lock.json ./

# ci instala de forma determinística a partir do lock file
RUN npm ci --omit=dev

# ============================================================
# Stage 2: builder — compila o Next.js
# ============================================================
FROM node:20-alpine AS builder
WORKDIR /app

# Copia node_modules já instalados do stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copia o restante do código-fonte
COPY . .

# Variáveis de build expostas ao cliente (NEXT_PUBLIC_*)
# Passadas via --build-arg no docker compose build
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_STORAGE_HOSTNAME

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_STORAGE_HOSTNAME=$NEXT_PUBLIC_SUPABASE_STORAGE_HOSTNAME

# Desativa telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ============================================================
# Stage 3: runner — imagem final mínima
# Usa output: 'standalone' do next.config.ts
# ============================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Cria usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copia os assets públicos e os arquivos gerados no build standalone
COPY --from=builder /app/public ./public

# O output standalone contém o servidor e todas as dependências necessárias
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js é gerado automaticamente pelo output: 'standalone'
CMD ["node", "server.js"]
