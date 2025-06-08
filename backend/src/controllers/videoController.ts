import { Request, Response, NextFunction } from 'express';
// import * as videoService from '../services/videoService';
import * as databaseService from '../services/databaseService';
import * as oldVideoService from '../services/videoService'; // Importa el servicio de videos antiguo
import fs from 'fs';
import path from 'path';

export const getAllVideos = async (req: Request, res: Response, next: NextFunction): Promise<void> => { // Promise<void> porque es async
  try {    
    const { search, filter_available } = req.query; // filter_available puede ser 'true' o 'false'
    let videos = await databaseService.getAllVideosFromDb();

    if (filter_available === 'true') {
      videos = videos.filter(video => video.is_available);
    } else if (filter_available === 'false') {
      videos = videos.filter(video => !video.is_available);
    }
    // No filtrar por defecto, mostrar todos
    if (search && typeof search === 'string') {
      const searchTerm = search.toLowerCase();
      videos = videos.filter(video =>
        (video.filename && video.filename.toLowerCase().includes(searchTerm)) ||
        (video.title && video.title.toLowerCase().includes(searchTerm)) ||
        (video.director && video.director.toLowerCase().includes(searchTerm))
        // Podrías añadir búsqueda por año si es necesario
      );
    }        
    res.json(videos); // No necesitas 'return' aquí
  } catch (error) {
    next(error);
  }
};

// Cambia el tipo de retorno a 'void'
export const downloadVideo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { filename } = req.params;
    if (!filename) {
      // No es necesario 'return' aquí, res.status().json() ya envía la respuesta
      res.status(400).json({ message: "Nombre de archivo requerido." });
      return; // Añade un return explícito para salir de la función
    }

    if (filename.includes('..')) {
      res.status(400).json({ message: "Nombre de archivo inválido." });
      return; // Añade un return explícito
    }

    // Opcional: Verificar en DB si está disponible y obtener filepath
    const videoRecords = await databaseService.getAllVideosFromDb(); // Podría ser más eficiente con un getByFilename
    const videoInfo = videoRecords.find(v => v.filename === filename);    

    if (!videoInfo || !videoInfo.is_available || !videoInfo.filepath) {
      res.status(404).json({ message: "Vídeo no encontrado o no disponible." });
      return;
    }    
    
    // La ruta en videoInfo.filepath ya es la ruta dentro del contenedor
    const filePath = videoInfo.filepath; 

    if (!fs.existsSync(filePath)) { // Doble chequeo, por si acaso la DB y el disco están desincronizados
      await databaseService.setVideoUnavailableInDb(filename); // Marcar como no disponible
      res.status(404).json({ message: "Archivo de vídeo no encontrado en disco, actualizando estado." });
      return;
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    // Opcional: Establecer Content-Type si lo conoces, aunque el navegador suele inferirlo.
    // const mimeType = 'video/mp4'; // O obténlo de alguna manera
    // res.setHeader('Content-Type', mimeType);
        
    const fileStream = fs.createReadStream(filePath);

    // Es importante manejar errores del stream aquí también
    fileStream.on('error', (err) => {
      console.error('Error en stream de descarga:', err);
      // Solo llama a next si no se han enviado las cabeceras.
      // Si el stream falla después de empezar a enviar, la conexión ya está comprometida.
      if (!res.headersSent) {
        // Podrías tener un error más específico o simplemente pasar el error
        // res.status(500).json({ message: "Error al leer el archivo de vídeo." });
        next(err); // Llama a next para el manejador de errores global
      } else {
        // Si ya se enviaron cabeceras, es más difícil manejar limpiamente.
        // Destruir el stream y la respuesta es una opción.
        fileStream.destroy();
        res.end(); // Intenta finalizar la respuesta si es posible
      }
    });

    // Cuando el stream termine, la respuesta se habrá enviado.
    fileStream.on('end', () => {
      // console.log('Stream finalizado y archivo enviado.');
    });

    // Si el cliente cierra la conexión
    req.on('close', () => {
      // console.log('Cliente cerró la conexión durante la descarga.');
      fileStream.destroy(); // Importante para liberar recursos
    });
    
    fileStream.pipe(res);

  } catch (error) { // Este catch atrapará errores ANTES de iniciar el stream
    next(error);
  }
};