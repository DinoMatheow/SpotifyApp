import type { APIContext } from "astro";
import { allPlaylists, songs as allSongs } from '../../lib/data';

export async function GET({ params, request }: APIContext) {
    const { url } = request;
    const urlObject = new URL(url);
    const id = urlObject.searchParams.get('id');

    const playlist = allPlaylists.find((playlist)=> playlist.id === id);
    const playlistSongs = allSongs.filter(song => song.albumId === playlist?.albumId);

    return new Response(
        JSON.stringify({ playlist, songs: playlistSongs }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}
