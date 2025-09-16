import { VolumenControl } from "./VolumenControl";
import { SongControl } from "./SongControl";
import { PlayIcon } from "@/icons/PlayIcon";
import { PauseIcon } from "@/icons/PauseIcon";
import { CurrentSongs } from "./CurrentSongs";
import { usePlayer } from "@/hooks/usePlayer";
import { PlayerControlButtonBar } from "./PlayerControl";
 
  
export const Player = () => {
  
   const { currentMusic,  audioRef, isPlaying, play, onNextSong } = usePlayer()
      
    return (
        <div className="flex flex-row justify-between w-full z-50">
            <div className="w-[200px]  ">
            {currentMusic.song && (
                <CurrentSongs
                    image={currentMusic.playlist?.cover}
                    title={currentMusic.song?.title ?? currentMusic.playlist?.title}
                    artists={currentMusic.playlist?.artists}
                />
                )}

            </div>
            <div className="grid place-content-center gap-4 flex-1">
                <div className="flex justify-center flex-col items-center -ml-20">
                <PlayerControlButtonBar />
                <SongControl  audio={audioRef.current} />
                <audio ref={audioRef}  onEnded={onNextSong}/>
                </div>
            </div>
            <div className="grid place-content-center" >
               <VolumenControl />
            </div>
        </div>
    )

}
