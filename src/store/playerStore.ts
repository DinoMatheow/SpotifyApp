import { create } from "zustand";

interface CurrentMusic {
    playlist: any | null;
    song: any | null;
    songs: any[];
};

interface PlayerState {
    isPlaying: boolean;
    currentMusic: CurrentMusic;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentMusic: (currentMusic: CurrentMusic) => void;
};


export const usePlayerStore = create<PlayerState>((set) => ({
    isPlaying: false,
    currentMusic: { playlist: null, song: null, songs: []},
    setIsPlaying: (isPlaying)=> set({isPlaying}),
    setCurrentMusic: ( currentMusic) => set({ currentMusic }),

}));