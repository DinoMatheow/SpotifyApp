import { create } from "zustand";
import type { Playlist } from "../lib/data";

interface CurrentMusic {
    playlist: Playlist | null;
    song: any | null;
    songs: any[];
};

    interface PlayerState {
        isPlaying: boolean;
        currentMusic: CurrentMusic;
        volumen: number;
        setVolumen: (volumen:number) => void;
        setIsPlaying: (isPlaying: boolean) => void;
        setCurrentMusic: (currentMusic: CurrentMusic) => void;
    };


    export const usePlayerStore = create<PlayerState>((set) => ({
        isPlaying: false,
        currentMusic: { playlist: null, song: null, songs: []},
        volumen: 1,
        setVolumen: (volumen) => set({volumen}),
        setIsPlaying: (isPlaying)=> set({isPlaying}),
        setCurrentMusic: ( currentMusic) => set({ currentMusic }),

    }));