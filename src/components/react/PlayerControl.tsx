import { Next, PlayIcon, Prev } from "../../icons/PlayIcon";
import { PauseIcon } from "@/icons/PauseIcon";
import { useCurrentMusic } from "../../hooks/useCurrentMusic";
import { usePlayerStore } from "@/store/playerStore";

export function PlayerControlButtonBar() {
  const {currentMusic, isPlaying, setIsPlaying, setCurrentMusic} = usePlayerStore(state => state);
  const { getNextSong, getPreviousSong } = useCurrentMusic(currentMusic);


  const onPlayPause = () => {
    if (currentMusic.song === null) return;
    setIsPlaying(!isPlaying);
  }


  const onNextSong = () => {
    const nextSong = getNextSong();
    if (nextSong) {
      setCurrentMusic({ ...currentMusic, song: nextSong });
    }
  }

  const onPrevSong = () => {
    const prevSong = getPreviousSong();
    if (prevSong) {
      setCurrentMusic({ ...currentMusic, song: prevSong });
    }
  }

  return (
    <div className="flex justify-center flex-row flex-nowrap items-center gap-4">
      <button className="hover:scale-110" onClick={onPrevSong} title="Previous song">
        <Prev/>
      </button>
      <button className="bg-white text-black rounded-full p-2 hover:scale-110" onClick={onPlayPause}>
        {isPlaying ? <PauseIcon  className="w-6 h-6 text-black" /> : <PlayIcon className="w-6 h-6 text-black"/>}
      </button>
      <button className="hover:scale-110" onClick={onNextSong} title="Next song">
        <Next/>
      </button>
    </div>
  );
}