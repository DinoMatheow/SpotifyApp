import {  useRef } from "react";
import { usePlayerStore } from "../store/playerStore";

 export const useVolumenControl = ()=>{

    const volume = usePlayerStore(state => state.volumen);
    const setVolume = usePlayerStore(state => state.setVolumen);
    const previusVolumeRef = useRef(volume);

    const isVolumeMuted = volume < 0.1

    const handleClickVolumen = ()=> {
        if (isVolumeMuted){
            setVolume(previusVolumeRef.current)
        } else{
            previusVolumeRef.current = volume
            setVolume(0)
        }
    };

        return {
            volume, 
            setVolume,

            // funtions 
            handleClickVolumen
                }      
};