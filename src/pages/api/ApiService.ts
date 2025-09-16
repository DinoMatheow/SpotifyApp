export function getPlayListInfoById(playListId: string) {
  return fetch(`/api/get-info-playlist.json?id=${playListId}`)
    .then(res => res.json());
}
