import fs from 'fs/promises';
import path from 'path';
import { getFfprobeMetadata, parseFilenameForTitleAndYear } from './videoMetadataService';
import { getTmdbDetails, TmdbDetailedMovieInfo } from './tmdbService';
import { upsertVideoInDb, getAllVideosFromDb, setVideoUnavailableInDb, VideoRecord } from './databaseService';

const VIDEO_DIR = process.env.VIDEO_DIRECTORY_PATH; // Esta es /app/videos_mounted en Docker
const ALLOWED_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm']; // De tu videoService

async function processSingleVideoFile(filename: string, fullFilepathOnDisk: string): Promise<void> {
  console.log(`Procesando: ${filename}`);
  const ffprobeMeta = await getFfprobeMetadata(fullFilepathOnDisk);

  let tmdbMeta: TmdbDetailedMovieInfo | null = null; 

  const { title: parsedTitle, year: parsedYear } = parseFilenameForTitleAndYear(filename);

  if (parsedTitle) {
    console.log(`   Título parseado: "${parsedTitle}", Año: ${parsedYear || 'N/A'}`);
    tmdbMeta = await getTmdbDetails(parsedTitle, parsedYear);
    if (tmdbMeta) {
      console.log(`   Encontrado en TMDB: "${tmdbMeta.title}" (${tmdbMeta.release_year})`);
    } else {
      console.log(`   No encontrado en TMDB o TMDB API key no configurada.`);
    }
  } else {
    console.log(`   No se pudo parsear título de: ${filename}`);
  }

  const videoDataToSave: VideoRecord = {
    filename,
    filepath: fullFilepathOnDisk, // Ruta que el backend usa para acceder (dentro del contenedor)
    is_available: true,
    size_bytes: ffprobeMeta.size_bytes,
    duration_seconds: ffprobeMeta.duration, // Asegúrate que el nombre coincida con el de la DB (duration_seconds)
    width: ffprobeMeta.width,
    height: ffprobeMeta.height,
    codec_name: ffprobeMeta.codec_name,
    bit_rate: ffprobeMeta.bit_rate,
    avg_frame_rate: ffprobeMeta.avg_frame_rate,
    display_aspect_ratio: ffprobeMeta.display_aspect_ratio,
    // TMDB data (usará null si tmdbMeta es null)
    title: tmdbMeta?.title || parsedTitle, // Fallback al título parseado si TMDB falla
    release_year: tmdbMeta?.release_year || parsedYear, // Fallback al año parseado
    director: tmdbMeta?.director || null,
    overview: tmdbMeta?.overview || null,
    cover_image_url: tmdbMeta?.poster_path_url || null,
    tmdb_id: tmdbMeta?.tmdb_id ? String(tmdbMeta.tmdb_id) : null, // Asegurar que es string para la DB si es VARCHAR
    imdb_id: tmdbMeta?.imdb_id || null,
  };
  // Ajustar nombre de campo 'duration' a 'duration_seconds' si es necesario para la DB
  // videoDataToSave.duration_seconds = videoDataToSave.duration; delete videoDataToSave.duration;

  await upsertVideoInDb(videoDataToSave);
  console.log(`   ${filename} guardado/actualizado en la DB.`);
}


export async function synchronizeVideos() {
  if (!VIDEO_DIR) {
    console.error("VIDEO_DIRECTORY_PATH no está configurado. No se puede sincronizar.");
    return;
  }
  console.log("Iniciando sincronización de vídeos...");

  let filesFromDisk: string[];
  try {
    filesFromDisk = (await fs.readdir(VIDEO_DIR)).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`El directorio de vídeos ${VIDEO_DIR} no existe. Creándolo o verifique la configuración.`);
      // Podrías intentar crearlo: await fs.mkdir(VIDEO_DIR, { recursive: true });
      // O simplemente salir si no es responsabilidad de este script crearlo.
      return;
    }
    console.error("Error leyendo el directorio de vídeos:", error);
    return;
  }
    
  const videosFromDb = await getAllVideosFromDb();
  const filenamesFromDb = new Set(videosFromDb.map(v => v.filename));
  const filenamesFromDisk = new Set(filesFromDisk);

  // 1. Procesar archivos nuevos o existentes en disco
  for (const filename of filesFromDisk) {
    const fullFilepath = path.join(VIDEO_DIR, filename);
    // Aquí podrías añadir lógica para solo procesar si es nuevo o si ha cambiado
    // Por ahora, procesaremos (lo que implica ffprobe y TMDB) para todos los que están en disco
    // La función upsertVideoInDb manejará si es INSERT o UPDATE.
    await processSingleVideoFile(filename, fullFilepath);
  }

  // 2. Marcar como no disponibles los que están en DB pero no en disco
  for (const dbVideo of videosFromDb) {
    if (dbVideo.is_available && !filenamesFromDisk.has(dbVideo.filename)) {
      console.log(`El archivo ${dbVideo.filename} ya no está en disco. Marcando como no disponible.`);
      await setVideoUnavailableInDb(dbVideo.filename);
    }
    // Opcional: Si un archivo vuelve a aparecer, marcarlo como disponible
    // (upsertVideoInDb ya lo hace con is_available: true)
  }
  console.log("Sincronización de vídeos completada.");
}

// Exportar funciones individuales si el watcher las va a usar
export { processSingleVideoFile, setVideoUnavailableInDb as handleDeletedVideoFile };