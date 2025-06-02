<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchVideos, getDownloadUrl, type Video } from '$lib/services/videoApi';

  let videos: Video[] = [];
  let isLoading = true;
  let error: string | null = null;
  let searchTerm = '';

  async function loadVideos(search: string = '') {
    isLoading = true;
    error = null;
    try {
      videos = await fetchVideos(search);
    } catch (e: any) {
      error = e.message || 'No se pudieron cargar los vídeos.';
      videos = []; // Limpiar videos en caso de error
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    loadVideos();
  });

  function handleSearch() {
    loadVideos(searchTerm);
  }

  function formatBytes(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
</script>


<div class="container">  

  
  <div class="text-center mb-6">    
    <h1 class="text-3xl font-bold mb-4">Video Arxive</h1>    
  </div>    

  <div class="search-bar">
    <input type="text" bind:value={searchTerm} placeholder="Buscar vídeos..." on:input={handleSearch} />
    <button on:click={() => loadVideos(searchTerm)}>Buscar</button>
  </div>

  {#if isLoading}
    <p>Cargando vídeos...</p>
  {:else if error}
    <p class="error-message">Error: {error}</p>
  {:else if videos.length === 0}
    <p>No hay vídeos disponibles que coincidan con la búsqueda.</p>
  {:else}
    <ul class="video-list">
      {#each videos as video (video.id)}
        <li class="video-item">
          <span class="video-filename">{video.filename}</span>
          <span class="video-size">({formatBytes(video.size)})</span>
          <a href={getDownloadUrl(video.filename)} download={video.filename} class="download-button">
            Descargar
          </a>
          <!-- Futuro: Botón para reproducir -->
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 1rem;
    font-family: sans-serif;
  }
  .search-bar {
    display: flex;
    margin-bottom: 1.5rem;
    gap: 0.5rem;
  }
  .search-bar input {
    flex-grow: 1;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
  .search-bar button {
    padding: 0.5rem 1rem;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  .search-bar button:hover {
    background-color: #0056b3;
  }
  .video-list {
    list-style: none;
    padding: 0;
  }
  .video-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    border-bottom: 1px solid #eee;
  }
  .video-item:last-child {
    border-bottom: none;
  }
  .video-filename {
    flex-grow: 1;
    margin-right: 1rem;
  }
  .video-size {
    font-size: 0.9em;
    color: #555;
    margin-right: 1rem;
  }
  .download-button {
    padding: 0.4rem 0.8rem;
    background-color: #28a745;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .download-button:hover {
    background-color: #1e7e34;
  }
  .error-message {
    color: red;
    padding: 1rem;
    border: 1px solid red;
    background-color: #ffebeb;
    border-radius: 4px;
  }

  /* Responsive */
  @media (max-width: 600px) {
    .video-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .download-button {
      align-self: flex-start; /* O flex-end si prefieres */
    }
  }
</style>