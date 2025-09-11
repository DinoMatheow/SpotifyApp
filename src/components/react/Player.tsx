import { VolumenControl } from "./VolumenControl";
import { SongControl } from "./SongControl";
import { PlayIcon } from "@/icons/PlayIcon";
import { PauseIcon } from "@/icons/PauseIcon";
import { CurrentSongs } from "./CurrentSongs";
import { usePlayer } from "@/hooks/usePlayer";
 
  
export const Player = () => {
  
   const { currentMusic, handleClick, audioRef, isPlaying } = usePlayer()
      
    return (
        <div className="flex flex-row justify-between w-full z-50">
            <div className="w-[260px]">
                <CurrentSongs 
                image={currentMusic.playlist?.cover}
                title={currentMusic.song?.title ?? currentMusic.playlist?.title}
                artists={currentMusic.playlist?.artists }
                />
            </div>
            <div className="grid place-content-center gap-4 flex-1">
                <div className="flex justify-center flex-col items-center" >
                <button className="bg-white rounded-full p-2" 
                onClick={ handleClick }
                >
                    {isPlaying ? <PauseIcon   className="w-6 h-6 text-black" /> : <PlayIcon  className="w-6 h-6 text-black"/>}
                </button>
                <SongControl  audio={audioRef.current} />
                <audio ref={audioRef} />
                </div>
            </div>
            <div className="grid place-content-center" >
               <VolumenControl />
            </div>
        </div>
    )

}
