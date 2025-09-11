import { useState, useEffect } from "react";

export const useSongControl =({audio}:{ audio: HTMLAudioElement | null })=>{
    const [currentTime, setCurrentTime] = useState(0);
    useEffect(() => {
        audio?.addEventListener('timeupdate', handleTimeUpdate )
      return () => {
        audio?.removeEventListener('timeupdate', handleTimeUpdate )
        
      }
    },[audio])
    
    const handleTimeUpdate =()=> {
        setCurrentTime(audio!.currentTime)
    }
    

    const formatDuration = (duration : number) =>{
      if (duration === 0) return `0:00`
      const seconds = Math.floor(duration % 60);
      const minutes = Math.floor(duration / 60);

      return `${minutes}:${seconds.toString().padStart(2,'0')}`
    }

    const duration =audio?.duration ?? 0;
   
    return {
        currentTime,
        duration,

        // funtions 
        handleTimeUpdate,
        formatDuration,

    }

};