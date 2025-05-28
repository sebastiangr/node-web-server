import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }); // Ajusta ruta si .env está en raíz del proyecto

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Conectado a PostgreSQL!');
});

pool.on('error', (err) => {
  console.error('Error inesperado en cliente de la pool de PostgreSQL', err);
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

// Ejemplo de creación de tabla (ejecutar una vez o con migraciones)
export const createVideosTable = async () => {
  const createTableQuery = `
  CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    filepath TEXT NOT NULL,
    size_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Futuros campos: duration_seconds INT, thumbnail_path TEXT, description TEXT
  );
  `;
  try {
    await pool.query(createTableQuery);
    console.log("Tabla 'videos' verificada/creada exitosamente.");
  } catch (err) {
    console.error("Error creando la tabla 'videos':", err);
  }
};
