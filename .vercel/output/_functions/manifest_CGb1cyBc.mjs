import 'kleur/colors';
import { q as decodeKey } from './chunks/astro/server_1Fggaf29.mjs';
import 'clsx';
import 'cookie';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_CGzwwKZu.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/","cacheDir":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/node_modules/.astro/","outDir":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/dist/","srcDir":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/","publicDir":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/public/","buildClientDir":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/dist/client/","buildServerDir":"file:///C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/apiservice","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/ApiService\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"ApiService","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/ApiService.ts","pathname":"/api/ApiService","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/get-info-playlist.json","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/get-info-playlist\\.json\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"get-info-playlist.json","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/get-info-playlist.json.ts","pathname":"/api/get-info-playlist.json","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/index.CJqP9oLj.css"}],"routeData":{"route":"/playlist/[id]","isIndex":false,"type":"page","pattern":"^\\/playlist\\/([^/]+?)\\/?$","segments":[[{"content":"playlist","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/playlist/[id].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/index.CJqP9oLj.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/pages/playlist/[id].astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/playlist/[id]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astrojs-ssr-virtual-entry",{"propagation":"in-tree","containsHead":false}],["C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/PlayListItemCard.astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/pages/index.astro",{"propagation":"in-tree","containsHead":true}],["\u0000@astro-page:src/pages/index@_@astro",{"propagation":"in-tree","containsHead":false}],["C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/layouts/Layout.astro",{"propagation":"in-tree","containsHead":false}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000noop-actions":"_noop-actions.mjs","\u0000@astro-page:src/pages/api/ApiService@_@ts":"pages/api/apiservice.astro.mjs","\u0000@astro-page:src/pages/api/get-info-playlist.json@_@ts":"pages/api/get-info-playlist.json.astro.mjs","\u0000@astro-page:src/pages/playlist/[id]@_@astro":"pages/playlist/_id_.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_CGb1cyBc.mjs","C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_BYv022f9.mjs","@/components/react/MusicTable":"_astro/MusicTable.4EZwHhH8.js","C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/angular/SearchBar.component":"_astro/SearchBar.g4q51DhB.js","C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts":"_astro/ClientRouter.astro_astro_type_script_index_0_lang.DZnDNxNb.js","@astrojs/react/client.js":"_astro/client.BT7SvXO9.js","@analogjs/astro-angular/client.js":"_astro/client.B-dlUMNN.js","C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/react/Player":"_astro/Player.ClQmSrZ2.js","@/components/react/CardPlayButtom":"_astro/CardPlayButtom.BuHH_X4X.js","C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/react/CardPlayButtom":"_astro/CardPlayButtom.BnzsTxtv.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/index.CJqP9oLj.css","/favicon.svg","/fonts/CircularStd-Black.woff2","/fonts/CircularStd-Bold.woff2","/fonts/CircularStd-Book.woff2","/fonts/CircularStd-Light.woff2","/fonts/CircularStd-Medium.woff2","/_astro/CardPlayButtom.BnzsTxtv.js","/_astro/CardPlayButtom.BuHH_X4X.js","/_astro/client.B-dlUMNN.js","/_astro/client.BT7SvXO9.js","/_astro/ClientRouter.astro_astro_type_script_index_0_lang.DZnDNxNb.js","/_astro/data.B394PtP7.js","/_astro/debug_node.CPORM32J.js","/_astro/index.CGcGeGy-.js","/_astro/index.CIgvz_UC.js","/_astro/MusicTable.4EZwHhH8.js","/_astro/Player.ClQmSrZ2.js","/_astro/playerStore.w4NP7gpZ.js","/_astro/SearchBar.g4q51DhB.js","/music/3/01.mp3","/music/3/02.mp3","/music/3/03.mp3","/music/3/04.mp3","/music/3/05.mp3","/music/1/01.mp3","/music/1/02.mp3","/music/1/03.mp3","/music/1/04.mp3","/music/1/05.mp3","/music/2/01.mp3","/music/2/02.mp3","/music/2/03.mp3","/music/2/04.mp3","/music/2/05.mp3","/music/4/01.mp3","/music/4/02.mp3","/music/4/03.mp3","/music/4/04.mp3","/music/4/05.mp3","/music/6/01.mp3","/music/6/02.mp3","/music/6/03.mp3","/music/6/04.mp3","/music/6/05.mp3","/music/5/01.mp3","/music/5/02.mp3","/music/5/03.mp3","/music/5/04.mp3","/music/5/05.mp3"],"buildFormat":"directory","checkOrigin":true,"serverIslandNameMap":[],"key":"iKRI1dE/JWQiVUPE2uPlkL2sIzPDtu1fjGRSjNZvKXQ="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
