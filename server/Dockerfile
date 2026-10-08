FROM node:20-alpine AS runner

WORKDIR /app

# Instalar dependencias necesarias para compilar y ejecutar
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar schema de prisma y generar cliente
COPY prisma ./prisma
RUN npx prisma generate

# Copiar código fuente
COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "src/index.js"]
