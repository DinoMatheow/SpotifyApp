import { e as createComponent, f as createAstro, m as maybeRenderHead, k as renderComponent, h as addAttribute, l as renderTransition, r as renderTemplate } from '../chunks/astro/server_1Fggaf29.mjs';
import 'kleur/colors';
import { C as CardPlayButtom, c as computed, $ as $$Layout } from '../chunks/CardPlayButtom_D8LQUVGt.mjs';
import { p as playlists } from '../chunks/data_Iwz7tl1E.mjs';
/* empty css                                 */
import { ɵ as __defineComponent, a as __domElementStart, b as __text, c as __domElementEnd, d as __advance, e as __textInterpolate1, s as signal } from '../chunks/_@astro-renderers_C72M30cu.mjs';
export { r as renderers } from '../chunks/_@astro-renderers_C72M30cu.mjs';

const $$Astro$1 = createAstro();
const $$PlayListItemCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$PlayListItemCard;
  const { playlist } = Astro2.props;
  const { id, cover, title, artists, color } = playlist;
  const artistString = artists.join(", ");
  return renderTemplate`${maybeRenderHead()}<article class="group relative hover:bg-zinc-800 shadow-lg hover:shadow-xl bg-zinc-500/30 rounded-md transition-all duration-300"> <div class="absolute right-4 bottom-20 translate-y-4 transition-all duration-500 opacity-0
    group-hover:opacity-100 z-10"> ${renderComponent($$result, "CardPlayButtom", CardPlayButtom, { "id": id, "client:visible": true, "size": "small", "client:component-hydration": "visible", "client:component-path": "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/react/CardPlayButtom", "client:component-export": "CardPlayButtom" })} </div> <a${addAttribute(`/playlist/${id}`, "href")} class="playlist-item transition-all duration-300 flex relative p-2 overflow-hidden gap-5 pb-6 rounded-md
 w-44 flex-col"${addAttribute(renderTransition($$result, "iyk6g74u", "", `playlist ${id} box`), "data-astro-transition-scope")}> <picture class="aspect-square  h-auto w-full flex-none"> <img${addAttribute(cover, "src")}${addAttribute(`cover of ${title} by ${artistString}`, "alt")} class="object-cover w-full h-full rounded-md"${addAttribute(renderTransition($$result, "ogeug6cu", "", `playlist ${id} image`), "data-astro-transition-scope")}> </picture> <div class="flex flex-auto flex-col p-x-2"> <h4 class="text-white text-sm"${addAttribute(renderTransition($$result, "ls2g7uvg", "", `playlist ${id} title`), "data-astro-transition-scope")}>${title}</h4> <span class="text-xs text-gray-400"${addAttribute(renderTransition($$result, "dhifvp3a", "", `playlist ${id} artists`), "data-astro-transition-scope")}> ${artistString} </span> </div> </a> </article>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/PlayListItemCard.astro", "self");

class GrettingComponent {
  constructor() {
    this.currentTime = signal(/* @__PURE__ */ new Date(), ...[]);
    this.currentHour = signal(this.currentTime().getHours(), ...[]);
    this.greeting = computed(() => {
      const hour = this.currentHour();
      if (hour < 12)
        return "Good morning";
      if (hour < 18)
        return "Good afternoon";
      return "Good night";
    }, ...[]);
  }
}
GrettingComponent.ɵfac = function GrettingComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || GrettingComponent)();
};
GrettingComponent.ɵcmp = /* @__PURE__ */ __defineComponent({ type: GrettingComponent, selectors: [["selector-name"]], decls: 2, vars: 1, consts: [[1, "text-3xl", "font-bold", "text-white"]], template: function GrettingComponent_Template(rf, ctx) {
  if (rf & 1) {
    __domElementStart(0, "h1", 0);
    __text(1);
    __domElementEnd();
  }
  if (rf & 2) {
    __advance();
    __textInterpolate1(" ", ctx.greeting(), " ");
  }
}, encapsulation: 2 });

const $$Astro = createAstro();
const $$Index = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Spotify clone" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div id="playlist-container" class="relative transition-all duration-1000 bg-green-600"> <!-- PageHeader --> <div class="relative z-10 px-6 pt-10"> <!-- Greetings --> <!-- <h1 class="text-4xl text-white">Good morning</h1> --> ${renderComponent($$result2, "GrettingComponent", GrettingComponent, {})} <div class="flex flex-wrap mt-6 gap-4"> ${playlists.map((playlist) => renderTemplate`${renderComponent($$result2, "PlayListItemCard", $$PlayListItemCard, { "playlist": playlist })}`)} </div> </div> <div class="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/80 "></div>  </div> ` })}`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/pages/index.astro", void 0);

const $$file = "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
