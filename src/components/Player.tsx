import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "../store/playerStore";


interface CurrentSongsProps {
    image?: string;
    title?: string;
    artists?: string[];
};

const CurrentSongs = ({image, title, artists}: CurrentSongsProps )=>{
    return (
        <div className="flex items-center gap-5 relative overflow-hidden">
            <picture className="w-16 h-16 bg-zinc-800 rounded-md shadow-lg overflow-hidden">
                <img src={ image } alt={ title } />
            </picture>

                <div className="flex flex-col">

                <h3 className="font-semibold text-sm block">{ title }</h3>
                <span> { artists?.join(', ') ?? 'Unknown Artist' } </span>
                </div>

        </div>


    )
}
 
// Componentes de iconos internos
export const PauseIcon = () => {
  return (
    <svg role="img" aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" 
    className="text-black h-6 w-6">
      <path
        d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"
      ></path>
    </svg>
  );
};

export const PlayIcon = () => {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 text-black" fill="currentColor">
      <path fill="currentColor" d="M8 5.14v14l11-7-11-7z"></path>
    </svg>
  );
};
  


export const Player = () => {
    const { isPlaying, setIsPlaying, currentMusic} = usePlayerStore(state => state);

    const audioRef = useRef<HTMLAudioElement | null>(null);


    useEffect(() => {
    if (!audioRef.current) return;

    isPlaying ?  audioRef.current.play() : audioRef.current.pause();
  }, [isPlaying]);
  
  useEffect(() => {
    const { song, playlist } = currentMusic;
    if (song && playlist) {
      const track = String(song.id).padStart(2, "0");
      const src = `/music/${playlist.id}/${track}.mp3`;
      console.log("Loading audio:", src);
  
      audioRef.current!.src = src;
  
      if (isPlaying) {
        audioRef.current
          ?.play()
      }
    }
  }, [currentMusic.song, currentMusic.playlist]); 
  
    

    const handleClick = () => {
       
    
        setIsPlaying(!isPlaying);
      };

    return (
        <div className="flex flex-row justify-between w-full px-4 z-50">
            <div>
                <CurrentSongs 
                image={currentMusic.playlist?.cover}
                title={currentMusic.song?.title ?? currentMusic.playlist?.title}
                artists={currentMusic.playlist?.artists }
                />
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
