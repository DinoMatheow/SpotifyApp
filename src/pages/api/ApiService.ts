export function getPlayListInfoById(playListId: string) {
  return fetch('/get-info-playlist.json')
    .then(res => res.json())
    .then(data => data[playListId]); // Devuelve solo la playlist y sus canciones
}
