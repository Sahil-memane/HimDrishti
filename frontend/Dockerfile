FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install deps inside the container so native bindings (rolldown/rollup)
# are compiled for Linux, not for the Windows host.
RUN npm install

COPY . .

EXPOSE 3000

# Vite 8 uses `--host` and `--port` directly.
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3000"]
