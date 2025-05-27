// src/server.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import videoRoutes from './routes/videoRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middlewares
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear JSON en el body de las requests
app.use(express.urlencoded({ extended: true })); // Para parsear URL-encoded data

// Rutas
app.get('/', (req: Request, res: Response) => {
  res.send('Video Streamer API está funcionando!');
});
app.use('/api/videos', videoRoutes);

// Manejador de errores global (simple)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Algo salió mal!', message: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend server corriendo en http://localhost:${PORT}`);
});