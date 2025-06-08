// backend/src/services/databaseService.ts
import { query } from '../config/database'; // Tu pool de conexión
import { FfprobeMetadata } from './videoMetadataService';
import { TmdbDetailedMovieInfo } from './tmdbService';

export interface VideoRecord extends FfprobeMetadata {
  id?: number; // Opcional porque al insertar no lo tenemos
  filename: string;
  filepath: string | null;
  is_available: boolean;

  // Campos de FfprobeMetadata
  size_bytes?: number | null; // Permitir null si ffprobe falla
  duration_seconds?: number | null; // Campo de la DB
  width?: number | null;
  height?: number | null;
  codec_name?: string | null;
  bit_rate?: number | null;
  avg_frame_rate?: string | null;
  display_aspect_ratio?: string | null;

  // Campos de TmdbDetailedMovieInfo
  title?: string | null;
  release_year?: number | null; // Campo de la DB
  director?: string | null;
  overview?: string | null;
  cover_image_url?: string | null; // URL del póster o carátula
  tmdb_id?: string | null; // Si en la DB es VARCHAR
  imdb_id?: string | null; // Si en la DB es VARCHAR
}

export async function upsertVideoInDb(videoData: VideoRecord): Promise<number | null> {
  const {
    filename, filepath, size_bytes, duration, width, height, codec_name, bit_rate, avg_frame_rate, display_aspect_ratio, // ffprobe
    title, release_year, director, overview, cover_image_url, tmdb_id, imdb_id, // tmdb
    is_available
  } = videoData;

  // Prepara los valores, usando NULL para undefined para que SQL los maneje correctamente
  const values = [
    filename, filepath, size_bytes ?? null, duration ?? null, width ?? null, height ?? null, codec_name ?? null, bit_rate ?? null, avg_frame_rate ?? null, display_aspect_ratio ?? null,
    title ?? null, release_year ?? null, director ?? null, overview ?? null, cover_image_url ?? null, tmdb_id ?? null, imdb_id ?? null,
    is_available
  ];

  const insertQuery = `
    INSERT INTO videos (
        filename, filepath, size_bytes, duration_seconds, width, height, codec_name, bit_rate, avg_frame_rate, display_aspect_ratio,
        title, year, director, overview, cover_image_url, tmdb_id, imdb_id,
        is_available, created_at, updated_at
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17,
        $18, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT (filename) DO UPDATE SET
        filepath = EXCLUDED.filepath,
        size_bytes = EXCLUDED.size_bytes,
        duration_seconds = EXCLUDED.duration_seconds,
        width = EXCLUDED.width,
        height = EXCLUDED.height,
        codec_name = EXCLUDED.codec_name,
        bit_rate = EXCLUDED.bit_rate,
        avg_frame_rate = EXCLUDED.avg_frame_rate,
        display_aspect_ratio = EXCLUDED.display_aspect_ratio,
        title = EXCLUDED.title,
        year = EXCLUDED.year,
        director = EXCLUDED.director,
        overview = EXCLUDED.overview,
        cover_image_url = EXCLUDED.cover_image_url,
        tmdb_id = EXCLUDED.tmdb_id,
        imdb_id = EXCLUDED.imdb_id,
        is_available = EXCLUDED.is_available,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id;
  `;
  try {
    const result = await query(insertQuery, values);
    return result.rows[0]?.id || null;
  } catch (error) {
    console.error(`Error en upsertVideoInDb para ${filename}:`, error);
    return null;
  }
}

export async function getAllVideosFromDb(): Promise<VideoRecord[]> {
  try {
    const result = await query('SELECT * FROM videos ORDER BY title, filename;');
    return result.rows;
  } catch (error) {
    console.error('Error obteniendo todos los vídeos de la DB:', error);
    return [];
  }
}

export async function setVideoUnavailableInDb(filename: string): Promise<void> {
  try {
    await query('UPDATE videos SET is_available = false, filepath = NULL, updated_at = CURRENT_TIMESTAMP WHERE filename = $1', [filename]);
    console.log(`Vídeo ${filename} marcado como no disponible en la DB.`);
  } catch (error) {
    console.error(`Error marcando ${filename} como no disponible:`, error);
  }
}