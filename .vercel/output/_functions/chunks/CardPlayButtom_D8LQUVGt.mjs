import { e as createComponent, f as createAstro, m as maybeRenderHead, h as addAttribute, n as renderSlot, r as renderTemplate, k as renderComponent, o as renderScript, p as renderHead, l as renderTransition } from './astro/server_1Fggaf29.mjs';
import 'kleur/colors';
/* empty css                         */
import { clsx } from 'clsx';
import { p as playlists, s as songs } from './data_Iwz7tl1E.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { twMerge } from 'tailwind-merge';
import { R as REACTIVE_NODE, f as consumerPollProducersForChange, g as consumerBeforeComputation, h as consumerAfterComputation, i as inject, I as Injector, D as DestroyRef, V as ViewContext, C as ChangeDetectionScheduler, N as NodeInjectorDestroyRef, E as EffectScheduler, j as EFFECTS, S as SIGNAL, n as noop, k as consumerDestroy, F as FLAGS, m as markAncestorsForTraversal, l as setActiveConsumer, o as setIsRefreshingViews, p as createComputed, ɵ as __defineComponent, q as __namespaceSVG, a as __domElementStart, t as __domElement, c as __domElementEnd, s as signal, u as __elementStart, v as __element, w as __listener, x as __elementEnd, y as __conditionalCreate, d as __advance, z as __property, A as __conditional, b as __text, B as __repeaterCreate, G as __nextContext, H as __repeater, J as __repeaterTrackByIndex, K as __getCurrentView, L as __restoreView, M as __resetView, O as __textInterpolate, e as __textInterpolate1, P as __sanitizeUrl } from './_@astro-renderers_C72M30cu.mjs';
import { create } from 'zustand';

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
const BASE_EFFECT_NODE = /* @__PURE__ */ (() => ({
  ...REACTIVE_NODE,
  consumerIsAlwaysLive: true,
  consumerAllowSignalWrites: true,
  dirty: true,
  hasRun: false,
  kind: "effect"
}))();
function runEffect(node) {
  node.dirty = false;
  if (node.hasRun && !consumerPollProducersForChange(node)) {
    return;
  }
  node.hasRun = true;
  const prevNode = consumerBeforeComputation(node);
  try {
    node.cleanup();
    node.fn();
  } finally {
    consumerAfterComputation(node, prevNode);
  }
}

/**
 * @license Angular v20.2.4
 * (c) 2010-2025 Google LLC. https://angular.io/
 * License: MIT
 */
function computed(computation, options) {
  const getter = createComputed(computation, options?.equal);
  return getter;
}
class EffectRefImpl {
  [SIGNAL];
  constructor(node) {
    this[SIGNAL] = node;
  }
  destroy() {
    this[SIGNAL].destroy();
  }
}
function effect(effectFn, options) {
  const injector = options?.injector ?? inject(Injector);
  let destroyRef = options?.manualCleanup !== true ? injector.get(DestroyRef) : null;
  let node;
  const viewContext = injector.get(ViewContext, null, {
    optional: true
  });
  const notifier = injector.get(ChangeDetectionScheduler);
  if (viewContext !== null) {
    node = createViewEffect(viewContext.view, notifier, effectFn);
    if (destroyRef instanceof NodeInjectorDestroyRef && destroyRef._lView === viewContext.view) {
      destroyRef = null;
    }
  } else {
    node = createRootEffect(effectFn, injector.get(EffectScheduler), notifier);
  }
  node.injector = injector;
  if (destroyRef !== null) {
    node.onDestroyFn = destroyRef.onDestroy(() => node.destroy());
  }
  const effectRef = new EffectRefImpl(node);
  return effectRef;
}
const EFFECT_NODE = /* @__PURE__ */ (() => ({
  ...BASE_EFFECT_NODE,
  cleanupFns: void 0,
  zone: null,
  onDestroyFn: noop,
  run() {
    const prevRefreshingViews = setIsRefreshingViews(false);
    try {
      runEffect(this);
    } finally {
      setIsRefreshingViews(prevRefreshingViews);
    }
  },
  cleanup() {
    if (!this.cleanupFns?.length) {
      return;
    }
    const prevConsumer = setActiveConsumer(null);
    try {
      while (this.cleanupFns.length) {
        this.cleanupFns.pop()();
      }
    } finally {
      this.cleanupFns = [];
      setActiveConsumer(prevConsumer);
    }
  }
}))();
const ROOT_EFFECT_NODE = /* @__PURE__ */ (() => ({
  ...EFFECT_NODE,
  consumerMarkedDirty() {
    this.scheduler.schedule(this);
    this.notifier.notify(
      12
      /* NotificationSource.RootEffect */
    );
  },
  destroy() {
    consumerDestroy(this);
    this.onDestroyFn();
    this.cleanup();
    this.scheduler.remove(this);
  }
}))();
const VIEW_EFFECT_NODE = /* @__PURE__ */ (() => ({
  ...EFFECT_NODE,
  consumerMarkedDirty() {
    this.view[FLAGS] |= 8192;
    markAncestorsForTraversal(this.view);
    this.notifier.notify(
      13
      /* NotificationSource.ViewEffect */
    );
  },
  destroy() {
    consumerDestroy(this);
    this.onDestroyFn();
    this.cleanup();
    this.view[EFFECTS]?.delete(this);
  }
}))();
function createViewEffect(view, notifier, fn) {
  const node = Object.create(VIEW_EFFECT_NODE);
  node.view = view;
  node.zone = typeof Zone !== "undefined" ? Zone.current : null;
  node.notifier = notifier;
  node.fn = createEffectFn(node, fn);
  view[EFFECTS] ??= /* @__PURE__ */ new Set();
  view[EFFECTS].add(node);
  node.consumerMarkedDirty(node);
  return node;
}
function createRootEffect(fn, scheduler, notifier) {
  const node = Object.create(ROOT_EFFECT_NODE);
  node.fn = createEffectFn(node, fn);
  node.scheduler = scheduler;
  node.notifier = notifier;
  node.zone = typeof Zone !== "undefined" ? Zone.current : null;
  node.scheduler.add(node);
  node.notifier.notify(
    12
    /* NotificationSource.RootEffect */
  );
  return node;
}
function createEffectFn(node, fn) {
  return () => {
    fn((cleanupFn) => (node.cleanupFns ??= []).push(cleanupFn));
  };
}

const PlayIcon = ({ className }) => {
    return (jsx("svg", { viewBox: "0 0 24 24", className: `${className} text-black`, fill: "currentColor", children: jsx("path", { fill: "currentColor", d: "M8 5.14v14l11-7-11-7z" }) }));
};
const Prev = () => (jsx("svg", { fill: "currentColor", role: "img", height: "16", width: "16", "aria-hidden": "true", viewBox: "0 0 16 16", children: jsx("path", { d: "M3.3 1a.7.7 0 0 1 .7.7v5.15l9.95-5.744a.7.7 0 0 1 1.05.606v12.575a.7.7 0 0 1-1.05.607L4 9.149V14.3a.7.7 0 0 1-.7.7H1.7a.7.7 0 0 1-.7-.7V1.7a.7.7 0 0 1 .7-.7h1.6z" }) }));
const Next = () => (jsx("svg", { fill: "currentColor", role: "img", height: "16", width: "16", "aria-hidden": "true", viewBox: "0 0 16 16", children: jsx("path", { d: "M12.7 1a.7.7 0 0 0-.7.7v5.15L2.05 1.107A.7.7 0 0 0 1 1.712v12.575a.7.7 0 0 0 1.05.607L12 9.149V14.3a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V1.7a.7.7 0 0 0-.7-.7h-1.6z" }) }));

const usePlayerStore = create((set) => ({
    isPlaying: false,
    currentMusic: { playlist: null, song: null, songs: [] },
    volumen: 1,
    setVolumen: (volumen) => set({ volumen }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setCurrentMusic: (currentMusic) => set({ currentMusic }),
}));

const PauseIcon = ({ className }) => {
    return (jsx("svg", { role: "img", "aria-hidden": "true", viewBox: "0 0 24 24", fill: "currentColor", className: `${className} text-black`, children: jsx("path", { d: "M6 4h4v16H6V4zm8 0h4v16h-4V4z" }) }));
};

const $$Astro$3 = createAstro();
const $$SideMenu = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$SideMenu;
  const { href } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<li class="list-none"> <a class="flex gap-4 text-zinc-400 hover:text-zinc-100 items-center py-3 px-5 font-medium transition duration-300" data-astro-transition${addAttribute(href, "href")}> ${renderSlot($$result, $$slots["default"])} </a> </li>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/SideMenu.astro", void 0);

const $$Library = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<svg data-encore-id="icon" role="img" aria-hidden="true" class="e-91000-icon e-91000-baseline e-91000-icon--auto-mirror" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M14.457 15.207a1 1 0 0 1-1.414-1.414L14.836 12l-1.793-1.793a1 1 0 0 1 1.414-1.414l2.5 2.5a1 1 0 0 1 0 1.414z"></path><path d="M20 22a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zM4 20V4h4v16zm16 0H10V4h10z"></path></svg>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/icons/Library.astro", void 0);

const $$Astro$2 = createAstro();
const $$SideMenuCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$SideMenuCard;
  const { playlist } = Astro2.props;
  const { id, cover, title, artists, color } = playlist;
  const artistString = artists.join(", ");
  return renderTemplate`${maybeRenderHead()}<a${addAttribute(`/playlist/${id}`, "href")} class="playlist-item flex relative p-2 overflow-hidden items-center gap-3 rounded-2xl hover:bg-zinc-800"> <picture class="h-12 w-12 flex-none"> <img${addAttribute(cover, "src")}${addAttribute(`cover of ${title} by ${artistString}`, "alt")} class="object-cover w-full h-full rounded-sm"> </picture> <div class="flex flex-auto flex-col truncate"> <h4 class="text-white text-sm">${title}</h4> <span class="text-xs text-gray-400"> ${artistString} </span> </div> </a>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/SideMenuCard.astro", void 0);

const $$More = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<svg data-encore-id="icon" role="img" class="text-gray-300" width="15" height="15" aria-hidden="true" fill="currentColor" viewBox="0 0 16 16"><path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75"></path></svg>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/icons/More.astro", void 0);

const $$Expand = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<svg data-encore-id="icon" role="img" aria-hidden="true" class="text-gray-300" fill="currentColor" width="15" height="15" viewBox="0 0 16 16"><path d="M6.53 9.47a.75.75 0 0 1 0 1.06l-2.72 2.72h1.018a.75.75 0 0 1 0 1.5H1.25v-3.579a.75.75 0 0 1 1.5 0v1.018l2.72-2.72a.75.75 0 0 1 1.06 0zm2.94-2.94a.75.75 0 0 1 0-1.06l2.72-2.72h-1.018a.75.75 0 1 1 0-1.5h3.578v3.579a.75.75 0 0 1-1.5 0V3.81l-2.72 2.72a.75.75 0 0 1-1.06 0"></path></svg>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/icons/Expand.astro", void 0);

const $$AsideMenu = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<nav class="flex flex-col flex-1 h-full"> <div class="bg-zinc-900 rounded-lg p-2 flex-1"> <div class="flex flex-row  gap-3 items-center"> ${renderComponent($$result, "LibraryIcon", $$Library, {})} <h3 class="text-white font-bold">Your Library</h3> <button class="flex ml-auto items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold px-3 py-1.5 rounded-2xl text-sm transition"> ${renderComponent($$result, "More", $$More, {})}
Create
</button> <button class="flex  bg-zinc-900 rounded-2xl px-2.5 py-2.5 hover:bg-zinc-800"> ${renderComponent($$result, "Expand", $$Expand, {})} </button> </div> <ul class="flex flex-col gap-0.5 h-full overflow-y-auto"> ${renderComponent($$result, "SideMenu", $$SideMenu, { "href": "/#" })} ${playlists.map((playlist) => renderTemplate`${renderComponent($$result, "SideMenuCard", $$SideMenuCard, { "playlist": playlist })}`)} </ul> </div> </nav>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/AsideMenu.astro", void 0);

const $$Astro$1 = createAstro();
const $$ClientRouter = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$ClientRouter;
  const { fallback = "animate" } = Astro2.props;
  return renderTemplate`<meta name="astro-view-transitions-enabled" content="true"><meta name="astro-view-transitions-fallback"${addAttribute(fallback, "content")}>${renderScript($$result, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/node_modules/astro/components/ClientRouter.astro", void 0);

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

function Slider({ className, defaultValue, value, min = 0, max = 100, ...props }) {
    const _values = React.useMemo(() => Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
            ? defaultValue
            : [min, max], [value, defaultValue, min, max]);
    return (jsxs(SliderPrimitive.Root, { "data-slot": "slider", defaultValue: defaultValue, value: value, min: min, max: max, className: cn(
        // 👇 importante: añadimos group para usar group-hover
        "group relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", className), ...props, children: [jsx(SliderPrimitive.Track, { "data-slot": "slider-track", className: cn("bg-zinc-900 relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"), children: jsx(SliderPrimitive.Range, { "data-slot": "slider-range", className: cn("bg-[#eeeeee] hover:bg-[#1DB954] absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full") }) }), Array.from({ length: _values.length }, (_, index) => (jsx(SliderPrimitive.Thumb, { "data-slot": "slider-thumb", className: "bg-white border border-white block size-3 shrink-0 rounded-full shadow-sm\n                     opacity-0 group-hover:opacity-100\n                     hover:bg-[#1DB954] hover:border-[#1DB954]\n                     transition-opacity duration-200\n                     focus-visible:outline-none" }, index)))] }));
}

const VolumeSilenced = () => (jsxs("svg", { fill: "currentColor", role: "presentation", height: "16", width: "16", "aria-hidden": "true", "aria-label": "Volumen apagado", viewBox: "0 0 16 16", children: [jsx("path", { d: "M13.86 5.47a.75.75 0 0 0-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 0 0 8.8 6.53L10.269 8l-1.47 1.47a.75.75 0 1 0 1.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 0 0 1.06-1.06L12.39 8l1.47-1.47a.75.75 0 0 0 0-1.06z" }), jsx("path", { d: "M10.116 1.5A.75.75 0 0 0 8.991.85l-6.925 4a3.642 3.642 0 0 0-1.33 4.967 3.639 3.639 0 0 0 1.33 1.332l6.925 4a.75.75 0 0 0 1.125-.649v-1.906a4.73 4.73 0 0 1-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 0 1-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z" })] }));
const VolumeLow = () => (jsx("svg", { fill: "currentColor", role: "presentation", height: "16", width: "16", "aria-label": "Volumen bajo", "aria-hidden": "true", id: "volume-icon", viewBox: "0 0 16 16", children: jsx("path", { d: "M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z" }) }));
const VolumeMedium = () => (jsx("svg", { fill: "currentColor", role: "presentation", height: "16", width: "16", "aria-label": "Volumen medio", "aria-hidden": "true", id: "volume-icon", viewBox: "0 0 16 16", children: jsx("path", { d: "M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 6.087a4.502 4.502 0 0 0 0-8.474v1.65a2.999 2.999 0 0 1 0 5.175v1.649z" }) }));
const VolumeFull = () => (jsxs("svg", { fill: "currentColor", role: "presentation", height: "16", width: "16", "aria-hidden": "true", "aria-label": "Volumen alto", id: "volume-icon", viewBox: "0 0 16 16", children: [jsx("path", { d: "M9.741.85a.75.75 0 0 1 .375.65v13a.75.75 0 0 1-1.125.65l-6.925-4a3.642 3.642 0 0 1-1.33-4.967 3.639 3.639 0 0 1 1.33-1.332l6.925-4a.75.75 0 0 1 .75 0zm-6.924 5.3a2.139 2.139 0 0 0 0 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 0 1 0 4.88z" }), jsx("path", { d: "M11.5 13.614a5.752 5.752 0 0 0 0-11.228v1.55a4.252 4.252 0 0 1 0 8.127v1.55z" })] }));
const VolumeIcon = ({ volume }) => {
    if (volume === 0)
        return jsx(VolumeSilenced, {});
    if (volume < 50)
        return jsx(VolumeLow, {});
    if (volume < 80)
        return jsx(VolumeMedium, {});
    return jsx(VolumeFull, {});
};

const useVolumenControl = () => {
    const volume = usePlayerStore(state => state.volumen);
    const setVolume = usePlayerStore(state => state.setVolumen);
    const previusVolumeRef = useRef(volume);
    const isVolumeMuted = volume < 0.1;
    const handleClickVolumen = () => {
        if (isVolumeMuted) {
            setVolume(previusVolumeRef.current);
        }
        else {
            previusVolumeRef.current = volume;
            setVolume(0);
        }
    };
    return {
        volume,
        setVolume,
        // funtions 
        handleClickVolumen
    };
};

const VolumenControl = () => {
    const { volume, setVolume, handleClickVolumen } = useVolumenControl();
    return (jsxs("div", { className: "flex justify-center gap-x-2 text-white", children: [jsx("button", { className: "opacity-70 hover:opacity-100 transition", onClick: handleClickVolumen, children: jsx(VolumeIcon, { volume: volume }) }), jsx(Slider, { defaultValue: [100], value: [volume * 100], max: 100, min: 0, className: "w-[95px]", onValueChange: (value) => {
                    const [newVolume] = value;
                    const volumenValue = newVolume / 100;
                    setVolume(volumenValue);
                } })] }));
};

const useSongControl = ({ audio }) => {
    const [currentTime, setCurrentTime] = useState(0);
    useEffect(() => {
        audio?.addEventListener('timeupdate', handleTimeUpdate);
        return () => {
            audio?.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [audio]);
    const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
    };
    const formatDuration = (duration) => {
        if (duration === 0)
            return `0:00`;
        const seconds = Math.floor(duration % 60);
        const minutes = Math.floor(duration / 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };
    const duration = audio?.duration ?? 0;
    return {
        currentTime,
        duration,
        // funtions 
        handleTimeUpdate,
        formatDuration,
    };
};

const SongControl = ({ audio }) => {
    const { currentTime, duration, formatDuration } = useSongControl({ audio });
    return (jsxs("div", { className: "flex gap-x-3 text-xs", children: [jsx("span", { className: "opacity-50 w-12 text-right", children: formatDuration(currentTime) }), jsx(Slider, { defaultValue: [0], value: [currentTime], max: duration, min: 0, className: "w-[450px]", onValueChange: (value) => {
                    audio.currentTime = value[0];
                } }), jsx("span", { className: "opacity-50 w-12", children: duration ? formatDuration(duration) : null })] }));
};

const CurrentSongs = ({ image, title, artists }) => {
    return (jsxs("div", { className: "flex items-center gap-5 relative overflow-hidden", children: [jsx("picture", { className: "w-16 h-16 bg-zinc-800 rounded-md shadow-lg overflow-hidden", children: jsx("img", { src: image, alt: title }) }), jsxs("div", { className: "flex flex-col", children: [jsx("h3", { className: "font-semibold text-sm block", children: title }), jsxs("span", { class: "text-xs text-gray-400", children: [" ", artists?.join(', ') ?? 'Unknown Artist', " "] })] })] }));
};

function useCurrentMusic(currentMusic) {
    const getCurrentSongIndex = () => {
        if (currentMusic.songs.length === 0 || currentMusic.song === null)
            return -1;
        return currentMusic.songs.findIndex(e => e.id === currentMusic.song.id) ?? -1;
    };
    const getNextSong = () => {
        const { songs } = currentMusic;
        const totalOfSongsInPlaylist = songs.length;
        if (totalOfSongsInPlaylist === 0)
            return null;
        const index = getCurrentSongIndex();
        if (index + 1 >= totalOfSongsInPlaylist) {
            return null;
        }
        return songs[index + 1];
    };
    const getPreviousSong = () => {
        const index = getCurrentSongIndex();
        if (index <= 0) {
            return null;
        }
        return currentMusic.songs[index - 1];
    };
    return { getPreviousSong, getNextSong };
}

const usePlayer = () => {
    const { isPlaying, setIsPlaying, currentMusic, volumen, setCurrentMusic } = usePlayerStore(state => state);
    const audioRef = useRef(null);
    const volumenRef = useRef(1);
    const { getNextSong } = useCurrentMusic(currentMusic);
    useEffect(() => {
        if (!audioRef.current)
            return;
        isPlaying ? audioRef.current.play() : audioRef.current.pause();
    }, [isPlaying]);
    useEffect(() => {
        audioRef.current.volume = volumen;
    }, [volumen]);
    useEffect(() => {
        const { song, playlist } = currentMusic;
        if (song && playlist) {
            const track = String(song.id).padStart(2, "0");
            const src = `/music/${playlist.id}/${track}.mp3`;
            audioRef.current.src = src;
            audioRef.current.volume = volumenRef.current;
            if (isPlaying) {
                audioRef.current
                    ?.play();
            }
        }
    }, [currentMusic.song, currentMusic.playlist]);
    const handleClick = () => {
        setIsPlaying(!isPlaying);
    };
    const play = () => {
        audioRef.current?.play()
            .catch((e) => console.log('error playing: ', e));
    };
    function onNextSong() {
        const nextSong = getNextSong();
        if (nextSong) {
            setCurrentMusic({ ...currentMusic, song: nextSong });
        }
    }
    return {
        isPlaying,
        currentMusic,
        audioRef,
        // function 
        handleClick,
        play,
        onNextSong,
    };
};

function PlayerControlButtonBar() {
    const { currentMusic, isPlaying, setIsPlaying, setCurrentMusic } = usePlayerStore(state => state);
    const { getNextSong, getPreviousSong } = useCurrentMusic(currentMusic);
    const onPlayPause = () => {
        if (currentMusic.song === null)
            return;
        setIsPlaying(!isPlaying);
    };
    const onNextSong = () => {
        const nextSong = getNextSong();
        if (nextSong) {
            setCurrentMusic({ ...currentMusic, song: nextSong });
        }
    };
    const onPrevSong = () => {
        const prevSong = getPreviousSong();
        if (prevSong) {
            setCurrentMusic({ ...currentMusic, song: prevSong });
        }
    };
    return (jsxs("div", { className: "flex justify-center flex-row flex-nowrap items-center gap-4", children: [jsx("button", { className: "hover:scale-110", onClick: onPrevSong, title: "Previous song", children: jsx(Prev, {}) }), jsx("button", { className: "bg-white text-black rounded-full p-2 hover:scale-110", onClick: onPlayPause, children: isPlaying ? jsx(PauseIcon, { className: "w-6 h-6 text-black" }) : jsx(PlayIcon, { className: "w-6 h-6 text-black" }) }), jsx("button", { className: "hover:scale-110", onClick: onNextSong, title: "Next song", children: jsx(Next, {}) })] }));
}

const Player = () => {
    const { currentMusic, audioRef, onNextSong } = usePlayer();
    return (jsxs("div", { className: "flex flex-row justify-between w-full z-50", children: [jsx("div", { className: "w-[200px]  ", children: currentMusic.song && (jsx(CurrentSongs, { image: currentMusic.playlist?.cover, title: currentMusic.song?.title ?? currentMusic.playlist?.title, artists: currentMusic.playlist?.artists })) }), jsx("div", { className: "grid place-content-center gap-4 flex-1", children: jsxs("div", { className: "flex justify-center flex-col items-center -ml-20", children: [jsx(PlayerControlButtonBar, {}), jsx(SongControl, { audio: audioRef.current }), jsx("audio", { ref: audioRef, onEnded: onNextSong })] }) }), jsx("div", { className: "grid place-content-center", children: jsx(VolumenControl, {}) })] }));
};

const $$Home = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<svg data-encore-id="icon" role="img" aria-hidden="true" class="e-91000-icon e-91000-baseline" width="25" height="25" viewBox="0 0 24 24" fill="currentColor"> <path d="M12.5 3.247a1 1 0 0 0-1 0L4 7.577V20h4.5v-6a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v6H20V7.577zm-2-1.732a3 3 0 0 1 3 0l7.5 4.33a2 2 0 0 1 1 1.732V21a1 1 0 0 1-1 1h-6.5a1 1 0 0 1-1-1v-6h-3v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.577a2 2 0 0 1 1-1.732z"></path> </svg>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/icons/Home.astro", void 0);

const $$Spotify = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<svg role="img" viewBox="0 0 24 24" aria-label="Spotify" aria-hidden="false" class="text-white" fill="currentColor" height="32" data-encore-id="logoSpotify"><title>Spotify</title><path d="M13.427.01C6.805-.253 1.224 4.902.961 11.524.698 18.147 5.853 23.728 12.476 23.99c6.622.263 12.203-4.892 12.466-11.514S20.049.272 13.427.01m5.066 17.579a.717.717 0 0 1-.977.268 14.4 14.4 0 0 0-5.138-1.747 14.4 14.4 0 0 0-5.42.263.717.717 0 0 1-.338-1.392c1.95-.474 3.955-.571 5.958-.29 2.003.282 3.903.928 5.647 1.92a.717.717 0 0 1 .268.978m1.577-3.15a.93.93 0 0 1-1.262.376 17.7 17.7 0 0 0-5.972-1.96 17.7 17.7 0 0 0-6.281.238.93.93 0 0 1-1.11-.71.93.93 0 0 1 .71-1.11 19.5 19.5 0 0 1 6.94-.262 19.5 19.5 0 0 1 6.599 2.165c.452.245.62.81.376 1.263m1.748-3.551a1.147 1.147 0 0 1-1.546.488 21.4 21.4 0 0 0-6.918-2.208 21.4 21.4 0 0 0-7.259.215 1.146 1.146 0 0 1-.456-2.246 23.7 23.7 0 0 1 8.034-.24 23.7 23.7 0 0 1 7.657 2.445c.561.292.78.984.488 1.546m13.612-.036-.832-.247c-1.67-.495-2.14-.681-2.14-1.353 0-.637.708-1.327 2.264-1.327 1.539 0 2.839.752 3.51 1.31.116.096.24.052.24-.098V6.935c0-.097-.027-.15-.098-.203-.83-.62-2.272-1.07-3.723-1.07-2.953 0-4.722 1.68-4.722 3.59 0 2.157 1.371 2.91 3.626 3.546l.973.274c1.689.478 1.998.902 1.998 1.556 0 1.097-.831 1.433-2.07 1.433-1.556 0-3.457-.911-4.35-2.025-.08-.098-.177-.053-.177.062v2.423c0 .097.01.141.08.22.743.814 2.52 1.53 4.59 1.53 2.546 0 4.456-1.485 4.456-3.784 0-1.787-1.052-2.865-3.625-3.635m10.107-1.76c-1.68 0-2.653 1.026-3.219 2.052V9.376c0-.08-.044-.124-.124-.124h-2.22c-.079 0-.123.044-.123.124V20.72c0 .08.044.124.124.124h2.22c.079 0 .123-.044.123-.124v-4.536c.566 1.025 1.521 2.034 3.237 2.034 2.264 0 3.89-1.955 3.89-4.581s-1.644-4.545-3.908-4.545m-.654 6.986c-1.185 0-2.211-1.167-2.618-2.458.407-1.362 1.344-2.405 2.618-2.405 1.211 0 2.051.92 2.051 2.423s-.84 2.44-2.051 2.44m40.633-6.826h-2.264c-.08 0-.115.017-.15.097l-2.282 5.483-2.29-5.483c-.035-.08-.07-.097-.15-.097h-3.661v-.584c0-.955.645-1.397 1.476-1.397.496 0 1.035.256 1.415.486.089.053.15-.008.115-.088l-.796-1.901a.26.26 0 0 0-.124-.133c-.389-.203-1.025-.38-1.644-.38-1.875 0-2.954 1.432-2.954 3.254v.743h-1.503c-.08 0-.124.044-.124.124v1.768c0 .08.044.124.124.124h1.503v6.668c0 .08.044.123.124.123h2.264c.08 0 .124-.044.124-.123v-6.668h1.936l2.812 6.11-1.512 3.325c-.044.098.009.142.097.142h2.414c.08 0 .116-.018.15-.097l4.997-11.355c.035-.08-.009-.141-.097-.141M54.964 9.04c-2.865 0-4.837 2.025-4.837 4.616 0 2.573 1.971 4.616 4.837 4.616 2.856 0 4.846-2.043 4.846-4.616 0-2.591-1.99-4.616-4.846-4.616m.008 7.065c-1.37 0-2.343-1.043-2.343-2.45 0-1.405.973-2.449 2.343-2.449 1.362 0 2.335 1.043 2.335 2.45 0 1.406-.973 2.45-2.335 2.45m33.541-6.334a1.24 1.24 0 0 0-.483-.471 1.4 1.4 0 0 0-.693-.17q-.384 0-.693.17a1.24 1.24 0 0 0-.484.471q-.174.302-.174.681 0 .375.174.677.175.3.484.471t.693.17.693-.17.483-.471.175-.676q0-.38-.175-.682m-.211 1.247a1 1 0 0 1-.394.39 1.15 1.15 0 0 1-.571.14 1.16 1.16 0 0 1-.576-.14 1 1 0 0 1-.391-.39 1.14 1.14 0 0 1-.14-.566q0-.316.14-.562t.391-.388.576-.14q.32 0 .57.14.253.141.395.39t.142.565q0 .312-.142.56m-19.835-5.78c-.85 0-1.468.6-1.468 1.396s.619 1.397 1.468 1.397c.866 0 1.485-.6 1.485-1.397 0-.796-.619-1.397-1.485-1.397m19.329 5.19a.31.31 0 0 0 .134-.262q0-.168-.132-.266-.132-.099-.381-.099h-.588v1.229h.284v-.489h.154l.374.489h.35l-.41-.518a.5.5 0 0 0 .215-.084m-.424-.109h-.26v-.3h.27q.12 0 .184.036a.12.12 0 0 1 .065.116.12.12 0 0 1-.067.111.4.4 0 0 1-.192.037M69.607 9.252h-2.263c-.08 0-.124.044-.124.124v8.56c0 .08.044.123.124.123h2.263c.08 0 .124-.044.124-.123v-8.56c0-.08-.044-.124-.124-.124m-3.333 6.605a2.1 2.1 0 0 1-1.053.257c-.725 0-1.185-.425-1.185-1.362v-3.484h2.211c.08 0 .124-.044.124-.124V9.376c0-.08-.044-.124-.124-.124h-2.21V6.944c0-.097-.063-.15-.15-.08l-3.954 3.113c-.053.044-.07.088-.07.16v1.007c0 .08.044.124.123.124h1.539v3.855c0 2.087 1.203 3.06 2.918 3.06.743 0 1.46-.194 1.884-.442.062-.035.07-.07.07-.133v-1.68c0-.088-.044-.115-.123-.07" transform="translate(-0.95,0)"></path></svg>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/icons/Spotify.astro", void 0);

class SearhIconComponent {
}
SearhIconComponent.ɵfac = function SearhIconComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || SearhIconComponent)();
};
SearhIconComponent.ɵcmp = /* @__PURE__ */ __defineComponent({ type: SearhIconComponent, selectors: [["SearchIcon"]], decls: 2, vars: 0, consts: [["data-encore-id", "icon", "role", "img", "aria-hidden", "true", "width", "20", "height", "20", "data-testid", "search-icon", "fill", "currentColor", 1, "e-91000-icon", "e-91000-baseline", "MpoH5sdgCUbPL5LCl3Cy", 2, "--encore-icon-height", "var(--encore-graphic-size-decorative-larger-3)", "--encore-icon-width", "var(--encore-graphic-size-decorative-larger-3)"], ["d", "M10.533 1.27893C5.35215 1.27893 1.12598 5.41887 1.12598 10.5579C1.12598 15.697 5.35215 19.8369 10.533 19.8369C12.767 19.8369 14.8235 19.0671 16.4402 17.7794L20.7929 22.132C21.1834 22.5226 21.8166 22.5226 22.2071 22.132C22.5976 21.7415 22.5976 21.1083 22.2071 20.7178L17.8634 16.3741C19.1616 14.7849 19.94 12.7634 19.94 10.5579C19.94 5.41887 15.7138 1.27893 10.533 1.27893ZM3.12598 10.5579C3.12598 6.55226 6.42768 3.27893 10.533 3.27893C14.6383 3.27893 17.94 6.55226 17.94 10.5579C17.94 14.5636 14.6383 17.8369 10.533 17.8369C6.42768 17.8369 3.12598 14.5636 3.12598 10.5579Z"]], template: function SearhIconComponent_Template(rf, ctx) {
  if (rf & 1) {
    __namespaceSVG();
    __domElementStart(0, "svg", 0);
    __domElement(1, "path", 1);
    __domElementEnd();
  }
}, encapsulation: 2 });

class ExploreIconComponent {
}
ExploreIconComponent.ɵfac = function ExploreIconComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || ExploreIconComponent)();
};
ExploreIconComponent.ɵcmp = /* @__PURE__ */ __defineComponent({ type: ExploreIconComponent, selectors: [["ExploreIcon"]], decls: 3, vars: 0, consts: [["data-encore-id", "icon", "role", "img", "fill", "currentColor", "aria-hidden", "true", "width", "26", "height", "26", "viewBox", "0 0 24 24", 1, "e-91000-icon", "e-91000-baseline"], ["d", "M15 15.5c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2"], ["d", "M1.513 9.37A1 1 0 0 1 2.291 9h19.418a1 1 0 0 1 .979 1.208l-2.339 11a1 1 0 0 1-.978.792H4.63a1 1 0 0 1-.978-.792l-2.339-11a1 1 0 0 1 .201-.837zM3.525 11l1.913 9h13.123l1.913-9zM4 2a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v4h-2V3H6v3H4z"]], template: function ExploreIconComponent_Template(rf, ctx) {
  if (rf & 1) {
    __namespaceSVG();
    __domElementStart(0, "svg", 0);
    __domElement(1, "path", 1)(2, "path", 2);
    __domElementEnd();
  }
}, encapsulation: 2 });

function SearchBarComponent_Conditional_7_For_5_Conditional_2_Template(rf, ctx) {
  if (rf & 1) {
    __element(0, "img", 11);
  }
  if (rf & 2) {
    const item_r2 = __nextContext().$implicit;
    __property("src", item_r2.cover, __sanitizeUrl)("alt", item_r2.title);
  }
}
function SearchBarComponent_Conditional_7_For_5_Conditional_3_Template(rf, ctx) {
  if (rf & 1) {
    __element(0, "img", 11);
  }
  if (rf & 2) {
    const item_r2 = __nextContext().$implicit;
    __property("src", item_r2.image, __sanitizeUrl)("alt", item_r2.title);
  }
}
function SearchBarComponent_Conditional_7_For_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = __getCurrentView();
    __elementStart(0, "li", 9);
    __listener("click", function SearchBarComponent_Conditional_7_For_5_Template_li_click_0_listener() {
      const item_r2 = __restoreView(_r1).$implicit;
      const ctx_r2 = __nextContext(2);
      return __resetView(ctx_r2.selectItems(item_r2));
    });
    __elementStart(1, "picture", 10);
    __conditionalCreate(2, SearchBarComponent_Conditional_7_For_5_Conditional_2_Template, 1, 2, "img", 11)(3, SearchBarComponent_Conditional_7_For_5_Conditional_3_Template, 1, 2, "img", 11);
    __elementEnd();
    __elementStart(4, "div")(5, "h4", 12);
    __text(6);
    __elementEnd();
    __elementStart(7, "span", 13);
    __text(8);
    __elementEnd()()();
  }
  if (rf & 2) {
    const item_r2 = ctx.$implicit;
    __advance(2);
    __conditional(item_r2.cover ? 2 : 3);
    __advance(4);
    __textInterpolate(item_r2.title);
    __advance(2);
    __textInterpolate1(" ", item_r2.artists.join(", "), " ");
  }
}
function SearchBarComponent_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    __elementStart(0, "div", 6)(1, "h3", 7);
    __text(2, "Searching");
    __elementEnd();
    __elementStart(3, "ul");
    __repeaterCreate(4, SearchBarComponent_Conditional_7_For_5_Template, 9, 3, "li", 8, __repeaterTrackByIndex);
    __elementEnd()();
  }
  if (rf & 2) {
    const ctx_r2 = __nextContext();
    __advance(4);
    __repeater(ctx_r2.filtered());
  }
}
class SearchBarComponent {
  constructor() {
    this.playlists = signal(playlists, ...[]);
    this.songs = signal(songs, ...[]);
    this.query = signal("", ...[]);
    this.filtered = signal([], ...[]);
    this.filterItem = effect(() => {
      this.filterItems(this.query());
    }, ...[]);
  }
  filterItems(val) {
    const query = val.toLowerCase().trim();
    if (!query) {
      this.filtered.set([]);
      return;
    }
    const results = [...this.playlists(), ...this.songs()].filter((item) => item.title.toLowerCase().includes(query));
    const uniqueResults = results.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index);
    this.filtered.set(uniqueResults);
  }
  selectItems(item) {
    this.query.set(item.title);
    this.filtered.set([]);
    window.location.href = `/playlist/${encodeURIComponent(item.id)}`;
  }
}
SearchBarComponent.ɵfac = function SearchBarComponent_Factory(__ngFactoryType__) {
  return new (__ngFactoryType__ || SearchBarComponent)();
};
SearchBarComponent.ɵcmp = /* @__PURE__ */ __defineComponent({ type: SearchBarComponent, selectors: [["selector-name"]], decls: 8, vars: 2, consts: [[1, "relative", "w-[477px]"], [1, "flex", "items-center", "gap-1", "bg-zinc-900", "rounded-full", "px-3", "py-3", "focus-within:border", "focus-within:border-white", "hover:bg-zinc-800", "transition-all", "duration-200"], [1, "w-5", "h-5", "text-zinc-400", "transition-colors", "duration-200", "focus-within:text-white"], ["type", "text", "placeholder", "What do you want to play?", 1, "bg-transparent", "outline-none", "text-1xl", "text-white", "placeholder-zinc-500", "flex-1", 3, "input", "value"], [1, "flex", "items-center", "gap-3"], [1, "w-px", "h-6", "bg-gray-400"], [1, "absolute", "left-0", "top-full", "mt-2", "w-full", "bg-zinc-800", "border", "border-zinc-700", "rounded-lg", "shadow-lg", "max-h-60", "overflow-auto", "z-50"], [1, "text-white", "font-bold", "px-4", "py-2"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "cursor-pointer", "hover:bg-zinc-700"], [1, "flex", "items-center", "gap-2", "px-4", "py-2", "cursor-pointer", "hover:bg-zinc-700", 3, "click"], [1, "h-12", "w-12", "flex-none"], [1, "h-12", "w-12", "rounded-md", 3, "src", "alt"], [1, "text-white", "text-lm"], [1, "text-sm", "text-gray-400"]], template: function SearchBarComponent_Template(rf, ctx) {
  if (rf & 1) {
    __elementStart(0, "div", 0)(1, "div", 1);
    __element(2, "SearchIcon", 2);
    __elementStart(3, "input", 3);
    __listener("input", function SearchBarComponent_Template_input_input_3_listener($event) {
      return ctx.query.set($event.target.value);
    });
    __elementEnd();
    __elementStart(4, "div", 4);
    __element(5, "div", 5)(6, "ExploreIcon");
    __elementEnd()();
    __conditionalCreate(7, SearchBarComponent_Conditional_7_Template, 6, 0, "div", 6);
    __elementEnd();
  }
  if (rf & 2) {
    __advance(3);
    __property("value", ctx.query());
    __advance(4);
    __conditional(ctx.filtered().length > 0 ? 7 : -1);
  }
}, dependencies: [SearhIconComponent, ExploreIconComponent], encapsulation: 2 });

const $$Alert = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<svg data-encore-id="icon" role="img" aria-hidden="true" class="text-gray-400 transition duration-300
           group-hover:text-white
           group-hover:drop-shadow-[0_0_8px_white]" fill="currentColor" width="15" height="15" viewBox="0 0 16 16" style="--encore-icon-height: var(--encore-graphic-size-decorative-smaller); --encore-icon-width: var(--encore-graphic-size-decorative-smaller);"><path d="M8 1.5a4 4 0 0 0-4 4v3.27a.75.75 0 0 1-.1.373L2.255 12h11.49L12.1 9.142a.75.75 0 0 1-.1-.374V5.5a4 4 0 0 0-4-4m-5.5 4a5.5 5.5 0 0 1 11 0v3.067l2.193 3.809a.75.75 0 0 1-.65 1.124H10.5a2.5 2.5 0 0 1-5 0H.957a.75.75 0 0 1-.65-1.124L2.5 8.569zm4.5 8a1 1 0 1 0 2 0z"></path></svg>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/icons/Alert.astro", void 0);

const $$NavbarMenu = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<nav class="flex flex-row items-center w-full gap-2 px-2 py-0 h-12"> <!-- Logo --> <div class="flex-1 flex items-3"> ${renderComponent($$result, "SideMenu", $$SideMenu, { "href": "/" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Spotify", $$Spotify, {})} ` })} </div> <!-- home/serch--> <div class="flex flex-[2] flex-row gap-2 ml-35"> <!-- home --> <div class="w-12   h-12 flex items-center justify-center bg-zinc-900 rounded-full hover:bg-zinc-800 cursor-pointer"> ${renderComponent($$result, "SideMenu", $$SideMenu, { "href": "/" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "HomeIcon", $$Home, { "class": "w-15 h-15 " })} ` })} </div> <!-- Search --> ${renderComponent($$result, "SearchBarComponent", SearchBarComponent, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/angular/SearchBar.component", "client:component-export": "SearchBarComponent" })} </div> <div class="flex-1 flex justify-end"> <div> ${renderComponent($$result, "Alert", $$Alert, {})} </div> </div> </nav>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/astro/NavbarMenu.astro", void 0);

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  return renderTemplate`<html lang="en" class="dark" data-astro-cid-sckkx6r4> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>Spotify</title>${renderComponent($$result, "ViewTransitions", $$ClientRouter, { "fallback": "none", "data-astro-cid-sckkx6r4": true })}${renderHead()}</head> <body data-astro-cid-sckkx6r4> <div id="app" class="relative h-screen p-2 gap-2" data-astro-cid-sckkx6r4> <header class="[grid-area:navbar]" data-astro-cid-sckkx6r4> ${renderComponent($$result, "NavbarMenu", $$NavbarMenu, { "data-astro-cid-sckkx6r4": true })} </header> <aside class="[grid-area:aside] flex flex-col overflow-y-auto rounded-xl bg-zinc-900 p-2" data-astro-cid-sckkx6r4> ${renderComponent($$result, "AsideMenu", $$AsideMenu, { "data-astro-cid-sckkx6r4": true })} </aside> <main class="[grid-area:main] rounded-lg bg-zinc-900 overflow-y-auto" data-astro-cid-sckkx6r4> ${renderSlot($$result, $$slots["default"])} </main> <footer class="[grid-area:player] h-[88px] relative z-[9999] " data-astro-cid-sckkx6r4> ${renderComponent($$result, "Player", Player, { "client:load": true, "data-astro-transition-persist": "media-player", "client:component-hydration": "load", "client:component-path": "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/components/react/Player", "client:component-export": "Player", "data-astro-cid-sckkx6r4": true, "data-astro-transition-scope": renderTransition($$result, "doctkgqq", "", "media-player") })} </footer> </div>  </body></html>`;
}, "C:/Users/axel1/OneDrive/Escritorio/Soft/Frameworks/React/clon-spotify/src/layouts/Layout.astro", "self");

const CardPlayButtom = ({ id, size = 'small' }) => {
    const { currentMusic, setCurrentMusic, isPlaying, setIsPlaying } = usePlayerStore(state => state);
    const isPlayingPlaylist = isPlaying && currentMusic.playlist?.id === id;
    const handleClick = () => {
        if (isPlayingPlaylist) {
            setIsPlaying(false);
            return;
        }
        fetch(`/api/get-info-playlist.json?id=${id}`)
            .then(res => res.json())
            .then(data => {
            const { songs, playlist } = data;
            setIsPlaying(true);
            setCurrentMusic({ songs, playlist, song: songs[0] });
            console.log({ playlist, songs });
        });
    };
    const iconsClassName = size === 'small' ? 'w-5 h-5' : 'w-7 h-7';
    return (jsx("button", { onClick: handleClick, className: "card-play-button rounded-full bg-green-500 p-3\r\n      hover:scale-[1.0] transition hover:bg-green-400", children: isPlayingPlaylist ? jsx(PauseIcon, { className: iconsClassName }) : jsx(PlayIcon, { className: iconsClassName }) }));
};

export { $$Layout as $, CardPlayButtom as C, PauseIcon as P, PlayIcon as a, computed as c, usePlayerStore as u };
