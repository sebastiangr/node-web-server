import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg'; // Asumo que ya lo tienes

export interface FfprobeMetadata {
  duration?: number | null; // Duración en segundos
  width?: number | null;
  height?: number | null;
  codec_name?: string | null;
  bit_rate?: number | null;
  avg_frame_rate?: string | null;
  display_aspect_ratio?: string | null;
  size_bytes?: number | null; // Añadido para tenerlo junto
}

export const getFfprobeMetadata = async (filePath: string): Promise<FfprobeMetadata> => {
  try {
    const stats = await fs.stat(filePath); // Obtener tamaño del archivo

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, data) => {
        if (err) {
          console.warn(`ffprobe no pudo procesar ${filePath}: ${err.message}`);
          // Resolvemos con tamaño si está disponible, incluso si ffprobe falla
          resolve({ size_bytes: stats?.size }); 
          return;
        }

        const videoStream = data.streams.find(stream => stream.codec_type === 'video');
        
        const metadata: FfprobeMetadata = {
          duration: data.format.duration ? Number(data.format.duration) : undefined,
          bit_rate: data.format.bit_rate ? Number(data.format.bit_rate) : (videoStream?.bit_rate ? Number(videoStream.bit_rate) : undefined),
          width: videoStream?.width,
          height: videoStream?.height,
          codec_name: videoStream?.codec_name,
          avg_frame_rate: videoStream?.avg_frame_rate,
          display_aspect_ratio: videoStream?.display_aspect_ratio,
          size_bytes: stats.size, // Incluir tamaño
        };

        // Limpieza de NaN
        for (const key in metadata) {
          if (typeof metadata[key as keyof FfprobeMetadata] === 'number' && isNaN(metadata[key as keyof FfprobeMetadata] as number)) {
            metadata[key as keyof FfprobeMetadata] = undefined;
          }
        }
        resolve(metadata);
      });
    });
  } catch (error) {
    // Si fs.stat falla (archivo no encontrado durante el proceso)
    console.error(`Error obteniendo stats o ffprobe para ${filePath}:`, error);
    return { size_bytes: undefined }; // Devolver objeto vacío o con solo tamaño undefined
  }
};

export const parseFilenameForTitleAndYear = (filename: string): { title: string | null, year: number | null } => {
  // Quitar extensión
  let nameWithoutExt = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  // Reemplazar puntos y guiones bajos por espacios (común en nombres de archivo)
  nameWithoutExt = nameWithoutExt.replace(/[._]/g, ' ');

  let title: string | null = nameWithoutExt;
  let year: number | null = null;

  // Intentar extraer año (ej. "Título (YYYY)" o "Título YYYY")
  const yearRegex = /\b(\d{4})\b/; // Busca 4 dígitos como una palabra
  const yearMatch = nameWithoutExt.match(yearRegex);

  if (yearMatch && yearMatch[1]) {
    const potentialYear = parseInt(yearMatch[1], 10);
    // Validar que sea un año razonable (e.g., no 0000 o 3000)
    if (potentialYear > 1880 && potentialYear < new Date().getFullYear() + 5) {
      year = potentialYear;
      // Intentar limpiar el año del título
      title = title.replace(yearRegex, '').replace(/\(\s*\)/g, '').trim(); // Elimina el año y paréntesis vacíos
    }
  }
    
  // Limpiar espacios múltiples y al inicio/final
  title = title.replace(/\s+/g, ' ').trim();
    
  return { title: title || null, year };
};