# ---- Etapa de Construcción (Builder Stage) ----
# Usamos una imagen de Node.js con Alpine Linux para construir la aplicación SvelteKit.
FROM node:18-alpine AS builder

# Establecer el directorio de trabajo DENTRO de la imagen
WORKDIR /app

# Copiar package.json y package-lock.json (o yarn.lock) PRIMERO
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para construir SvelteKit)
RUN npm install

# Copiar el resto del código fuente del frontend a la imagen
COPY . .

# (Importante para SvelteKit con Vite) Variables de entorno para el build:
# Si tu frontend necesita saber la URL del backend EN TIEMPO DE BUILD,
# puedes pasarla como un argumento de build (ARG) y luego como una variable de entorno (ENV).
# Ejemplo: ARG VITE_API_BASE_URL_BUILD_ARG
#          ENV VITE_API_BASE_URL=$VITE_API_BASE_URL_BUILD_ARG
# Y luego construir con: docker-compose build --build-arg VITE_API_BASE_URL_BUILD_ARG=http://...
#
# Alternativamente, si tu frontend puede leer variables de entorno en TIEMPO DE EJECUCIÓN
# (menos común con Vite para VITE_ variables, pero posible con configuraciones específicas
# o si pasas la URL al iniciar el servidor Node.js de SvelteKit),
# entonces no necesitas pasarla aquí en el build.
#
# Por ahora, asumiremos que VITE_API_BASE_URL se definirá en runtime o que
# el frontend usa una URL relativa si está detrás de un reverse proxy.
# Si usas un .env en `frontend/` para VITE_API_BASE_URL, ese será usado por `npm run build`.

# Construir la aplicación SvelteKit para producción (usando adapter-node)
# El resultado irá a la carpeta /app/build (según svelte.config.js)
RUN npm run build


# ---- Etapa de Producción (Production Stage) / Desarrollo con Hot-Reload ----
# Empezamos desde una imagen base de Node.js limpia y ligera para ejecutar el servidor SvelteKit.
FROM node:18-alpine

# Establecer el directorio de trabajo DENTRO de la imagen
WORKDIR /app

# (Importante para SvelteKit con adapter-node)
# No necesitamos copiar package.json e instalar dependencias OTRA VEZ si
# la build de adapter-node es autocontenida o si el package.json en /app/build
# ya tiene las dependencias necesarias para el servidor.
# `adapter-node` genera un servidor autónomo.
COPY package*.json ./

RUN npm install --ignore-scripts 

# Copiar SOLO la carpeta 'build' (que contiene el servidor Node.js compilado de SvelteKit)
# y el package.json y lockfile de la raíz del proyecto frontend, ya que el servidor
# Node.js de adapter-node podría necesitar ejecutar `npm install` para sus propias dependencias
# (aunque a menudo `adapter-node` empaqueta todo lo necesario).
COPY . .
# COPY --from=builder /app/build ./build
# COPY --from=builder /app/package.json ./package.json
# COPY --from=builder /app/package-lock.json ./package-lock.json

# El servidor Node.js generado por adapter-node puede tener sus propias dependencias
# de producción definidas en el package.json que copia.
# Si es así, necesitamos instalar solo esas.
# Si el build es completamente autocontenido, este `npm install` podría no ser necesario
# o incluso podría dar un error si no hay dependencias.
# Es una práctica común incluirlo por si acaso.
# Podrías probar sin él primero, y si falla al iniciar, añadirlo.
# RUN npm install --omit=dev --ignore-scripts

# (Opcional, si `adapter-node` genera un package.json DENTRO de la carpeta `build`
# que es diferente al de la raíz del proyecto frontend)
# COPY --from=builder /app/build/package.json ./build/package.json
# WORKDIR /app/build
# RUN npm install --omit=dev --ignore-scripts
# WORKDIR /app # Volver al directorio principal

# Establecer el entorno a producción
# ENV NODE_ENV=production
ENV NODE_ENV=development

# El servidor SvelteKit (adapter-node) escuchará en el puerto definido por la variable de entorno PORT,
# o 3000 por defecto. Exponemos este puerto.
EXPOSE 5173

# Comando para ejecutar el servidor Node.js generado por SvelteKit (adapter-node).
# El punto de entrada suele ser build/index.js
# CMD ["node", "build/index.js"]
CMD ["npm", "run", "dev"]