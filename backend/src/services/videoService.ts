import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

// const VIDEO_DIR = process.env.VIDEO_DIRECTORY_PATH || '/app/videos_mounted'; // Ruta dentro del contenedor
const VIDEO_DIR = '/home/sebastian/Vídeos/testing'; // Ruta dentro del contenedor
const ALLOWED_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm']; // Agrega más si es necesario

export interface VideoMetadata {
  duration?: number; // Duración en segundos
  width?: number; // Ancho del vídeo
  height?: number; // Alto del vídeo
  bitrate?: string; // Bitrate en kbps
  format?: string; // Formato del vídeo (ej. mp4, mkv)
  codec_name?: string; // Codec del vídeo (ej. h264, hevc)
  aspect_radio?: string; // Relación de aspecto (ancho/alto)
  frame_rate?: string; // Tasa de fotogramas (frames per second)
  color_space?: string; // Espacio de color (ej. yuv420p)
  color_range?: string; // Rango de color (ej. mpeg)
  bit_rate?: number; // Tasa de bits en bits por segundo (bps)
}

interface VideoFile {
  id: string; // Usaremos el nombre de archivo como ID por simplicidad
  filename: string;
  path: string;
  size: number; // en bytes
  metadata?: VideoMetadata; // Metadatos opcionales  
}

// Función helper para obtener metadatos con ffprobe
const getVideoMetadata = (filePath: string): Promise<VideoMetadata> => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        // Si ffprobe falla (ej. archivo corrupto o no es un vídeo),
        // resolvemos con objeto vacío en lugar de rechazar para no romper el listado completo
        console.warn(`ffprobe no pudo procesar ${filePath}: ${err.message}`);
        resolve({});
        return;
      }

      const videoStream = data.streams.find(stream => stream.codec_type === 'video');
    
      const metadata: VideoMetadata = {
        duration: data.format.duration, // Duración del formato (generalmente el vídeo completo)
        width: videoStream?.width,
        height: videoStream?.height,
        bitrate: videoStream?.max_bit_rate, // Bitrate máximo del vídeo
        codec_name: videoStream?.codec_name,
        aspect_radio: videoStream?.display_aspect_ratio,
        frame_rate: videoStream?.avg_frame_rate, // Tasa de fotogramas
        color_space: videoStream?.color_space,
        color_range: videoStream?.color_range,
        bit_rate: data.format.bit_rate ? Number(data.format.bit_rate) : (videoStream?.bit_rate ? Number(videoStream.bit_rate) : undefined),   
      };
      // Asegurarse de que los valores numéricos sean realmente números
      if (metadata.duration && isNaN(Number(metadata.duration))) metadata.duration = undefined;
      if (metadata.bit_rate && isNaN(Number(metadata.bit_rate))) metadata.bit_rate = undefined;
      if (metadata.width && isNaN(Number(metadata.width))) metadata.width = undefined;
      if (metadata.height && isNaN(Number(metadata.height))) metadata.height = undefined;


      resolve(metadata);
    });
  });
};

// Función para listar vídeos en el directorio
export const listVideos = async (): Promise<VideoFile[]> => {
  try {
    const files = await fs.readdir(VIDEO_DIR);
    const videoFilesPromises: Promise<VideoFile | null>[] = []; // Array de promesas para videos
    // const videoFiles: VideoFile[] = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const filePath = path.join(VIDEO_DIR, file);

        // Creamos una promesa para cada archivo que incluye obtener sus metadatos
        const videoFilePromise = (async (): Promise<VideoFile | null> => {
          try {
            const stats = await fs.stat(filePath);
            const metadata = await getVideoMetadata(filePath); // Obtener metadatos
            return {
              id: file,
              filename: file,
              path: filePath,
              size: stats.size,
              metadata: metadata, // Incluir metadatos
            };
          } catch (statError) {
            console.error(`Error obteniendo stats para ${filePath}:`, statError);
            return null; // Si fs.stat falla, no incluimos el archivo
          }
        })();
        videoFilesPromises.push(videoFilePromise);

        // const stats = await fs.stat(filePath);
        // videoFiles.push({
        //   id: file, // Usar nombre de archivo como ID único (simple)
        //   filename: file,
        //   path: filePath, // Ruta completa en el servidor
        //   size: stats.size,
        //   duration: 0, // Aquí podrías calcular la duración si tienes una librería para ello
        //   // Por ahora, dejamos la duración en 0, pero podrías usar una librería como 'fluent-ffmpeg' para obtenerla
        //   // duration: getVideoDuration(filePath), // Implementa esta función si es necesario
        //   // O podrías usar una librería como 'ffprobe' para obtener metadatos más detallados                    
        // });
      }
    }

    // Esperamos a que todas las promesas (incluyendo la obtención de metadatos) se resuelvan
    const resolvedVideoFiles = await Promise.all(videoFilesPromises);
        
    // Filtramos los nulos (en caso de errores al obtener stats)
    return resolvedVideoFiles.filter(video => video !== null) as VideoFile[];

    // return videoFiles;
  } catch (error) {
    console.error('Error listando videos:', error);
    // Si el directorio no existe o no es accesible, devuelve un array vacío o lanza un error más específico.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Directorio de videos no encontrado: ${VIDEO_DIR}`);
      return [];
    }
    throw new Error('No se pudieron listar los vídeos.');
  }
};

export const getVideoPath = (filename: string): string => {
  // Aquí podrías añadir validaciones para evitar path traversal si `filename` es malicioso
  // Por ahora, asumimos que filename es seguro porque lo obtenemos de `listVideos`
  return path.join(VIDEO_DIR, filename);
};