-- ~/video-streamer-app/scripts/db_init.sql

-- Asegurarse de que la extensión para UUIDs esté disponible si la necesitas en el futuro
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear la tabla de videos si no existe
-- Esta es la estructura que planeamos para cuando integremos TMDB, etc.
CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,                      -- ID numérico autoincremental
    filename VARCHAR(255) NOT NULL UNIQUE,      -- Nombre del archivo, debe ser único
    filepath TEXT,                              -- Ruta DENTRO del contenedor donde el backend lo encuentra. Puede ser NULL si is_available = false
    size_bytes BIGINT,                          -- Tamaño en bytes
    is_available BOOLEAN DEFAULT TRUE,          -- Indica si el archivo físico está presente y accesible
    
    -- Metadatos de ffprobe
    duration_seconds NUMERIC(10, 2),            -- Duración en segundos, con 2 decimales
    width INTEGER,
    height INTEGER,
    codec_name VARCHAR(50),
    bit_rate INTEGER,                           -- Tasa de bits en bps
    avg_frame_rate VARCHAR(20),
    display_aspect_ratio VARCHAR(20),

    -- Metadatos de TMDB
    title TEXT,                                 -- Título de la película/serie obtenido de la API externa
    year INTEGER,                               -- Año de lanzamiento
    director TEXT,
    overview TEXT,                              -- Resumen o sinopsis
    cover_image_url TEXT,                       -- URL de la imagen de portada
    tmdb_id VARCHAR(50) UNIQUE,                 -- ID de TMDB, puede ser null si no se encuentra
    imdb_id VARCHAR(50) UNIQUE,                 -- ID de IMDb, puede ser null

    -- Campos de auditoría y estado
    -- (Podrías añadir más como 'last_scanned_at', 'needs_metadata_update', etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento de las búsquedas
CREATE INDEX IF NOT EXISTS idx_videos_title ON videos (title);
CREATE INDEX IF NOT EXISTS idx_videos_is_available ON videos (is_available);
-- El índice UNIQUE en 'filename' ya se crea por la restricción UNIQUE.

-- (Opcional) Crear una función para actualizar 'updated_at' automáticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para la tabla 'videos' para actualizar 'updated_at' en cada UPDATE
-- Primero eliminamos el trigger si existe, para evitar errores al re-ejecutar el script
DROP TRIGGER IF EXISTS set_timestamp_videos ON videos;
-- Luego lo creamos
CREATE TRIGGER set_timestamp_videos
BEFORE UPDATE ON videos
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- (Futuro) Tabla de usuarios (la dejamos comentada por ahora)
/*
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER set_timestamp_users
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
*/

-- Mensaje para los logs de PostgreSQL
\echo '*************************************'
\echo 'Script db_init.sql ejecutado con éxito.'
\echo 'Tabla "videos" creada/verificada.'
\echo 'Trigger "set_timestamp_videos" creado/verificado.'
\echo '----------------------------------------------------'