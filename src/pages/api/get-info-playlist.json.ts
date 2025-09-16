import type { APIContext } from "astro";
import { allPlaylists, songs as allSongs } from '../../lib/data';

export async function GET({ request }: APIContext) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'No id provided' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const playlist = allPlaylists.find(p => p.id === id);
    if (!playlist) {
      return new Response(JSON.stringify({ error: 'Playlist not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }

    const playlistSongs = allSongs.filter(song => song.albumId === playlist.albumId);

    return new Response(JSON.stringify({ playlist, songs: playlistSongs }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
