const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface Video {
  id: string;
  filename: string;
  path: string; // La ruta en el servidor, el frontend no la usa directamente para acceder
  size: number;
}

export async function fetchVideos(searchTerm: string = ''): Promise<Video[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/videos?search=${encodeURIComponent(searchTerm)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Error fetching videos: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch videos:', error);
    throw error; // Relanzar para que el componente lo maneje
  }
}

export function getDownloadUrl(filename: string): string {
  return `${API_BASE_URL}/videos/${encodeURIComponent(filename)}/download`;
}