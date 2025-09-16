import { a as allPlaylists, s as songs } from '../../chunks/data_Iwz7tl1E.mjs';
export { r as renderers } from '../../chunks/_@astro-renderers_C72M30cu.mjs';

async function GET({ params, request }) {
    const { url } = request;
    const urlObject = new URL(url);
    const id = urlObject.searchParams.get('id');
    const playlist = allPlaylists.find((playlist) => playlist.id === id);
    const playlistSongs = songs.filter(song => song.albumId === playlist?.albumId);
    return new Response(JSON.stringify({ playlist, songs: playlistSongs }), { headers: { 'Content-Type': 'application/json' } });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
