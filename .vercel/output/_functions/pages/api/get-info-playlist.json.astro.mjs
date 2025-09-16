import { a as allPlaylists, s as songs } from '../../chunks/data_Iwz7tl1E.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C72M30cu.mjs';

async function GET({ request }) {
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
        const playlistSongs = songs.filter(song => song.albumId === playlist.albumId);
        return new Response(JSON.stringify({ playlist, songs: playlistSongs }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    catch (err) {
        console.error(err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
