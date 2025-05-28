import fs from 'fs/promises';
import path from 'path';

const VIDEO_DIR = process.env.VIDEO_DIRECTORY_PATH || '/app/videos_mounted'; // Ruta dentro del contenedor
const ALLOWED_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm']; // Agrega más si es necesario

interface VideoFile {
  id: string; // Usaremos el nombre de archivo como ID por simplicidad
  filename: string;
  path: string;
  size: number; // en bytes
  // Podrías añadir más metadatos aquí (fecha, duración, etc.)
}

export const listVideos = async (): Promise<VideoFile[]> => {
  try {
    const files = await fs.readdir(VIDEO_DIR);
    const videoFiles: VideoFile[] = [];

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        const filePath = path.join(VIDEO_DIR, file);
        const stats = await fs.stat(filePath);
        videoFiles.push({
          id: file, // Usar nombre de archivo como ID único (simple)
          filename: file,
          path: filePath, // Ruta completa en el servidor
          size: stats.size,
        });
      }
    }
    return videoFiles;
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