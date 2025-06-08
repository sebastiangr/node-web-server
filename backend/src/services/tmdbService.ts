import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';

interface TmdbMinimalMovieInfo {
  id: number; // TMDB ID
  title: string;
  release_date?: string; // "YYYY-MM-DD"
}

export interface TmdbDetailedMovieInfo {
  tmdb_id: number;
  imdb_id: string | null;
  title: string;
  overview: string | null;
  release_year: number | null;
  poster_path_url: string | null; // URL completa del póster
  director: string | null;
  // Puedes añadir más: genres, runtime, vote_average etc.
}

async function searchMovieOnTmdb(queryTitle: string, queryYear?: number): Promise<TmdbMinimalMovieInfo | null> {
  if (!TMDB_API_KEY) {
    console.warn("TMDB_API_KEY no está configurada. Saltando búsqueda en TMDB.");
    return null;
  }
  if (!queryTitle) return null;

  try {
    const params: any = { api_key: TMDB_API_KEY, query: queryTitle, language: 'es-ES' }; // Añadir idioma
    if (queryYear) {
      params.year = queryYear; // o primary_release_year, TMDB es flexible aquí
    }
    console.log(`Buscando en TMDB: title="${queryTitle}", year=${queryYear}`);
    const response = await axios.get(`${TMDB_BASE_URL}/search/movie`, { params, timeout: 5000 });

    if (response.data && response.data.results && response.data.results.length > 0) {
      // Por ahora, tomamos el primer resultado. Se podría mejorar con lógica de coincidencia.
      const firstResult = response.data.results[0];
      return {
        id: firstResult.id,
        title: firstResult.title,
        release_date: firstResult.release_date,
      };
    }
    console.log(`No se encontraron resultados en TMDB para: "${queryTitle}" (${queryYear || 'sin año'})`);
    return null;
  } catch (error: any) {
    console.error(`Error buscando en TMDB para "${queryTitle}":`, error.message);
    return null;
  }
}

export async function getTmdbDetails(titleFromFile: string, yearFromFile?: number | null): Promise<TmdbDetailedMovieInfo | null> {
  const searchResult = await searchMovieOnTmdb(titleFromFile, yearFromFile || undefined);
  if (!searchResult || !searchResult.id) {
    return null;
  }

  try {
    const response = await axios.get(`${TMDB_BASE_URL}/movie/${searchResult.id}`, {
      params: {
        api_key: TMDB_API_KEY,
        append_to_response: 'credits,external_ids',
        language: 'es-ES'
      },
      timeout: 5000
    });

    const data = response.data;
    let director: string | null = null;
    if (data.credits && data.credits.crew) {
      const directorObj = data.credits.crew.find((person: any) => person.job === 'Director');
      if (directorObj) {
        director = directorObj.name;
      }
    }

    const releaseYear = data.release_date ? parseInt(data.release_date.substring(0, 4), 10) : null;

    return {
      tmdb_id: data.id,
      imdb_id: data.external_ids?.imdb_id || null,
      title: data.title,
      overview: data.overview || null,
      release_year: releaseYear,
      poster_path_url: data.poster_path ? `${TMDB_IMAGE_BASE_URL}w500${data.poster_path}` : null,
      director: director,
    };

  } catch (error: any) {
    console.error(`Error obteniendo detalles de TMDB para ID ${searchResult.id} ("${searchResult.title}"):`, error.message);
    return null;
  }
}