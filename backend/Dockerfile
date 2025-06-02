# ---- Etapa de Construcción (Builder Stage) ----
# Usamos una imagen de Node.js con Alpine Linux (ligera) que incluye herramientas de build
# Nombramos esta etapa como 'builder' para poder referenciarla luego.
FROM node:18-alpine AS builder

# Establecer el directorio de trabajo DENTRO de la imagen
WORKDIR /app

# Copiar package.json y package-lock.json (o yarn.lock) PRIMERO
# Esto aprovecha el cache de capas de Docker: si estos archivos no cambian,
# Docker no reinstalará las dependencias innecesariamente en builds subsecuentes.
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo devDependencies para compilar TypeScript)
RUN npm install

# Copiar el resto del código fuente del backend a la imagen
COPY . .

# Compilar el código TypeScript a JavaScript
# El resultado irá a la carpeta /app/dist (según tu tsconfig.json)
RUN npm run build


# ---- Etapa de Producción (Production Stage) / Desarrollo con Hot-Reload ----
# Empezamos desde una imagen base de Node.js limpia y ligera para producción.
FROM node:18-alpine

# Establecer el directorio de trabajo DENTRO de la imagen
WORKDIR /app

# Copiar package.json y package-lock.json (o yarn.lock) OTRA VEZ
# (Podríamos optimizar más esto, pero por simplicidad lo hacemos así primero)
COPY package*.json ./

# Instalar SOLO las dependencias de PRODUCCIÓN
# --omit=dev (o --production para versiones antiguas de npm)
# --ignore-scripts: útil si tus dependencias tienen postinstall scripts que no necesitas en producción
# RUN npm install --omit=dev --ignore-scripts
RUN npm install --ignore-scripts

# Copiar los artefactos de compilación (código JavaScript de la carpeta /app/dist)
# desde la etapa 'builder' a la etapa actual.
# COPY --from=builder /app/dist ./dist

# (Opcional pero recomendado) Copiar el archivo .env del backend.
# Sin embargo, es MEJOR práctica pasar configuraciones sensibles como variables de entorno
# a través de Docker Compose, en lugar de hornear el .env en la imagen.
# Por ahora lo copiaremos, pero tenlo en cuenta para mejorar.
# COPY .env . 
COPY . .

# Si decides NO copiar el .env aquí, ASEGÚRATE de que todas las variables necesarias
# (DATABASE_URL, VIDEO_DIRECTORY_PATH, BACKEND_PORT) se definan en la sección
# 'environment' del servicio backend en docker-compose.yml.

# Exponer el puerto en el que la aplicación Node.js escuchará DENTRO del contenedor.
# Esto es más bien documentación; no publica el puerto al host automáticamente.
# Eso se hace en docker-compose.yml.
EXPOSE 3001

# Comando para ejecutar la aplicación cuando el contenedor se inicie.
# Ejecuta el server.js compilado que está en la carpeta dist.
# CMD ["node", "dist/server.js"]
CMD [ "npm", "run", "dev" ]