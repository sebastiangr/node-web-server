import express, { Application, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { checkDbConnection } from './config/database'; 
import videoRoutes from './routes/videoRoutes';

dotenv.config();

const app: Application = express();
const PORT = process.env.BACKEND_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; 

// Middlewares
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json()); // Para parsear JSON en el body de las requests
app.use(express.urlencoded({ extended: true })); // Para parsear URL-encoded data

// Rutas
app.get('/', (req: Request, res: Response) => {
  res.send('Web-server: ¡Video Streamer API está funcionando!');
});
app.use('/api/videos', videoRoutes);

// Manejador de errores global (simple)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Algo salió mal: ', message: err.message });
});


// app.listen(PORT, () => {
//   console.log(`Backend server corriendo en http://localhost:${PORT}`);
// });

app.listen(Number(PORT), HOST, () => { // Añade HOST como segundo argumento
  // Para mostrar la IP local accesible en la red
  const networkInterfaces = require('os').networkInterfaces();
  let localIp = 'localhost'; // Por defecto
  // Busca la IP de la interfaz de red principal (ej. eth0, wlan0, en0)
  // Esto es un poco heurístico y puede necesitar ajustes según tu sistema
  for (const ifaceName of Object.keys(networkInterfaces)) {
    for (const iface of networkInterfaces[ifaceName]!) { // El '!' asume que networkInterfaces[ifaceName] no es undefined
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address;
        break; // Toma la primera IP no interna encontrada
      }
    }
    if (localIp !== 'localhost') break; // Si ya encontramos una, salimos
  }  
  console.log(`Backend server running on: http://${localIp}:${PORT} (local network)`);
  console.log(`Backend server running on: http://localhost:${PORT}`);
  checkDbConnection(); // Llamar a la función de prueba
});