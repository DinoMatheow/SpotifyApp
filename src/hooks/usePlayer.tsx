import { usePlayerStore } from "@/store/playerStore";
import { useEffect, useRef } from "react";
 
  
export const usePlayer = () => {
    const { isPlaying, setIsPlaying, currentMusic, volumen} = usePlayerStore(state => state);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const volumenRef = useRef(1);

    useEffect(() => {
    if (!audioRef.current) return;

    isPlaying ?  audioRef.current.play() : audioRef.current.pause();
  }, [isPlaying]);


  useEffect(() => {
    audioRef.current!.volume = volumen
  }, [volumen])
  

  
  useEffect(() => {
    const { song, playlist } = currentMusic;
    if (song && playlist) {
      const track = String(song.id).padStart(2, "0");
      const src = `/music/${playlist.id}/${track}.mp3`;
  
      audioRef.current!.src = src;
      audioRef.current!.volume = volumenRef.current
  
      if (isPlaying) {
        audioRef.current
          ?.play()
      }
    }
  }, [currentMusic.song, currentMusic.playlist]); 
  
    

    const handleClick = () => {
       
    
        setIsPlaying(!isPlaying);
      };

      
    return {
        isPlaying,
        currentMusic,
        audioRef,
        // function 
        handleClick,
    }

}
