import { Request, Response, NextFunction } from 'express';
import * as videoService from '../services/videoService';
import fs from 'fs'; // Usar 'fs' síncrono para check de existencia y stream
import path from 'path';

export const getAllVideos = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search } = req.query;
    let videos = await videoService.listVideos();

    if (search && typeof search === 'string') {
      videos = videos.filter(video =>
        video.filename.toLowerCase().includes(search.toLowerCase())
      );
    }
    res.json(videos);
  } catch (error) {
    next(error);
  }
};

export const downloadVideo = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).json({ message: "Nombre de archivo requerido." });
    }

    // Validar que filename no contenga '..' para evitar path traversal
    if (filename.includes('..')) {
      return res.status(400).json({ message: "Nombre de archivo inválido." });
    }
    
    const filePath = videoService.getVideoPath(filename);

    // Comprobar si el archivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Vídeo no encontrado." });
    }
    
    // Establecer cabeceras para forzar la descarga
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (err) => {
      console.error('Error en stream de descarga:', err);
      // Asegurarse de que no se envíe otra respuesta si ya se empezó a enviar
      if (!res.headersSent) {
          res.status(500).json({ message: "Error al descargar el vídeo." });
      }
      next(err); // Pasar al manejador de errores global
    });

    // Opcional: manejar cierre de conexión por parte del cliente
    req.on('close', () => {
      fileStream.destroy(); // Cierra el stream si el cliente se desconecta
    });

  } catch (error) {
    next(error);
  }
};