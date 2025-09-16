import { r as renderers } from './chunks/_@astro-renderers_C72M30cu.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_CMm1BoHq.mjs';
import { manifest } from './manifest_BGkGOAKs.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/apiservice.astro.mjs');
const _page2 = () => import('./pages/api/get-info-playlist.json.astro.mjs');
const _page3 = () => import('./pages/playlist/_id_.astro.mjs');
const _page4 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/ApiService.ts", _page1],
    ["src/pages/api/get-info-playlist.json.ts", _page2],
    ["src/pages/playlist/[id].astro", _page3],
    ["src/pages/index.astro", _page4]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./_noop-actions.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "83255c52-196a-4e01-b714-58c09d03ee49",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
