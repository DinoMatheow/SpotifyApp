import { useEffect, useRef, useState } from "react";

// Componentes de iconos internos
const PauseIcon = () => {
  return (
    <svg role="img" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className="text-black h-6 w-6">
      <path
        d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"
      ></path>
    </svg>
  );
};

const PlayIcon = () => {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-black" fill="currentColor">
      <path fill="currentColor" d="M8 5.14v14l11-7-11-7z"></path>
    </svg>
  );
};
  


export const Player = () => {

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSong, setCurrentSong] = useState(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.src = `/music/1/01.mp3`;
        }
    }, [])
    

    const handleClick = () => {
        if (!audioRef.current) return; // seguridad por si aún es null
    
        if (isPlaying) {
          audioRef.current.pause();
        } else {
          audioRef.current.play();
        }
    
        setIsPlaying(!isPlaying);
      };

    return (
        <div className="flex flex-row justify-between w-full px-4 z-50">
            <div>
                CurrentSong...
            </div>
            <div className="grid place-content-center gap-4 flex-1">
                <div className="flex justify-center" />
                <button className="bg-white rounded-full p-2" 
                onClick={ handleClick }
                >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <audio ref={audioRef} />
            </div>
            <div>
                Volumen
            </div>
        </div>
    )

}
