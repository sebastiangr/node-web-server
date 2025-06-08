import { Request, Response, NextFunction } from 'express';
import { synchronizeVideos } from '../services/syncService';

export const triggerSync = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // No esperar a que termine para responder, ya que puede tardar.
    // Ejecutar en segundo plano sin await.
    synchronizeVideos().catch(err => {
      console.error("Error durante la sincronización en segundo plano:", err);
    });
    res.status(202).json({ message: "Sincronización de vídeos iniciada en segundo plano." });
  } catch (error) {
    next(error);
  }
};