FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install

FROM deps AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npx next build

FROM node:20-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production TZ=Europe/Sofia UPLOAD_DIR=/app/uploads
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p 3000"]
