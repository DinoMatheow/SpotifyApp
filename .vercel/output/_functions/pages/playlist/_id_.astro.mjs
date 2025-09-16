import { e as createComponent, f as createAstro, k as renderComponent, r as renderTemplate, m as maybeRenderHead, h as addAttribute, l as renderTransition } from '../../chunks/astro/server_1Fggaf29.mjs';
import 'kleur/colors';
import { jsxs, jsx } from 'react/jsx-runtime';
import { a as allPlaylists, s as songs } from '../../chunks/data_Iwz7tl1E.mjs';
import { u as usePlayerStore, P as PauseIcon, a as PlayIcon, $ as $$Layout, C as CardPlayButtom } from '../../chunks/CardPlayButtom_D8LQUVGt.mjs';
import { g as getPlayListInfoById } from '../../chunks/ApiService_Bw55lnKP.mjs';
/* empty css                                    */
export { r as renderers } from '../../chunks/_@astro-renderers_C72M30cu.mjs';

const TimeIcon = () => (jsxs("svg", { role: "img", height: "16", width: "16", "aria-hidden": "true", viewBox: "0 0 16 16", fill: "currentColor", children: [jsx("path", { d: "M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" }), jsx("path", { d: "M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z" })] }));

const isNewSongOfAnotherPlaylist = (currentMusic, song) => {
    return currentMusic.playlist?.id != song.albumId;
};
const setNewCurrentMusic = (song, setIsPlaying, setCurrentMusic) => {
    getPlayListInfoById(song.albumId).then(data => {
        const { songs, playlist } = data;
        setCurrentMusic({ songs: songs, playlist: playlist, song: song });
    }).then(() => {
        setIsPlaying(true);
    });
};
const MusicsTablePlay = ({ song, isCurrentSong }) => {
    const { currentMusic, isPlaying, setIsPlaying, setCurrentMusic } = usePlayerStore(state => state);
    const isCurrentSongRunning = (song) => {
        return (currentMusic.song?.id == song.id)
            && (currentMusic.playlist?.albumId == song.albumId)
            && isPlaying;
    };
    const handleClick = (song) => {
        if (isCurrentSongRunning(song)) {
            setIsPlaying(false);
            return;
        }
        if (isNewSongOfAnotherPlaylist(currentMusic, song)) {
            setNewCurrentMusic(song, setIsPlaying, setCurrentMusic);
            return;
        }
        // the playlist is the same, but the song is different
        if (currentMusic.song?.id !== song.id) {
            setCurrentMusic({ songs: currentMusic.songs, playlist: currentMusic.playlist, song: song });
        }
        setIsPlaying(true);
    };
    const className = "hover:scale-125";
    return (jsx("button", { className: "text-white", onClick: () => handleClick(song), children: isCurrentSongRunning(song) ? jsx(PauseIcon, { className: className }) : jsx(PlayIcon, { className: className }) }));
};

const isCurrentSong = (song) => {
    const { song: currentSong, playlist } = usePlayerStore(state => state.currentMusic);
    return currentSong?.id == song.id && playlist?.albumId == song.albumId;
};
const MusicsTable = ({ songs }) => {
    return (jsxs("table", { className: "table-auto text-left min-w-full divide-y divide-gray-500/20", children: [jsx("thead", { className: "", children: jsxs("tr", { className: "text-zinc-400 text-sm", children: [jsx("th", { className: "px-4 py-2 font-light", children: "#" }), jsx("th", { className: "px-4 py-2 font-light", children: "T\u00EDtulo" }), jsx("th", { className: "px-4 py-2 font-light", children: "\u00C1lbum" }), jsx("th", { className: "px-4 py-2 font-light", children: jsx(TimeIcon, {}) })] }) }), jsxs("tbody", { children: [jsx("tr", { className: "h-[16px]" }), songs.map((song, index) => {
                        const isCurrentSongBoolean = isCurrentSong(song);
                        return (jsxs("tr", { className: "text-gray-300 border-spacing-0 text-sm font-light hover:bg-white/10 overflow-hidden transition duration-300 group", children: [jsxs("td", { className: "relative px-4 py-2 rounded-tl-lg rounded-bl-lg w-5", children: [jsx("span", { className: "absolute top-5 opacity-100 transition-all group-hover:opacity-0", children: index + 1 }), jsx("div", { className: "absolute top-5 opacity-0 transition-all group-hover:opacity-100", children: jsx(MusicsTablePlay, { song: song, isCurrentSong: isCurrentSongBoolean }) })] }), jsxs("td", { className: "px-4 py-2 flex gap-3", children: [jsx("picture", { className: "", children: jsx("img", { src: song.image, alt: song.title, className: "w-11 h-11" }) }), jsxs("div", { className: "flex flex-col", children: [jsx("h3", { className: `text-base font-normal
                        ${isCurrentSongBoolean ? "text-green-400" : "text-White"}
                        `, children: song.title }), jsx("span", { children: song.artists.join(", ") })] })] }), jsx("td", { className: "px-4 py-2", children: song.album }), jsx("td", { className: "px-4 py-2 rounded-tr-lg rounded-br-lg", children: song.duration })] }, `{song.albumId}-${song.id}`));
                    })] })] }));
};

const $$Astro = createAstro();
const $$id = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const { id } = Astro2.params;
  const playlist = allPlaylists.find((playlist2) => playlist2.id === id);
  const playListsSongs = songs.filter((song) => song.albumId === playlist?.albumId);
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Spotify clone" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div id="playlist-container" class="relative flex flex-col h-full  bg-green-900 "${addAttribute(renderTransition($$result2, "lwbbxtwc", "", `playlist-${id}-box`), "data-astro-transition-scope")}> <!-- PageHeader --> <header class="flex flex-row gap-8 px-6 mt-12"> <picture class="aspect-square w-52 h-52 flex-none"> <img${addAttribute(playlist?.cover, "src")}${addAttribute(`Cover of ${playlist?.title}`, "alt")} class="object-cover w-full h-full shadow-lg"${addAttribute(renderTransition($$result2, "jkadwh6j", "", `playlist ${playlist?.id} image`), "data-astro-transition-scope")}> </picture> <div class="flex flex-col justify-between"> <h2 class="flex flex-1 items-end text-white">Playlist</h2> <div> <h1 class="text-5xl font-bold block text-white"> <span${addAttribute(renderTransition($$result2, "vl5qskca", "", `playlist ${playlist?.id} title`), "data-astro-transition-scope")}> ${playlist?.title} </span> </h1> </div> <div class="flex-1 flex items-end"> <div class="text-sm text-gray-300 font-normal"> <div${addAttribute(renderTransition($$result2, "2qsllmyo", "", `playlist ${playlist?.id} artists`), "data-astro-transition-scope")}> <span>${playlist?.artists.join(", ")}</span> </div> <p class="mt-1"> <span class="text-white"> ${playListsSongs.length} canciones</span>,
                3 h aproximadamente
</p> </div> </div> </div> </header> <div class="pl-8 pt-6"> ${renderComponent($$result2, "CardPlayButtom", CardPlayButtom, { "client:load": true, "id": id, "size": "large", "client:component-hydration": "load", "client:component-path": "@/components/react/CardPlayButtom", "client:component-export": "CardPlayButtom" })} </div> <div class="relative z-10 px-6 pt-10"> <!-- Greetings --></div> <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 -z-1"></div> <section class="p-4"> ${renderComponent($$result2, "MusicsTable", MusicsTable, { "songs": playListsSongs, "client:visible": true, "client:component-hydration": "visible", "client:component-path": "@/components/react/MusicTable", "client:component-export": "MusicsTable" })} </section> </div> ` })} `;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/pages/playlist/[id].astro", "self");

const $$file = "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/pages/playlist/[id].astro";
const $$url = "/playlist/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
