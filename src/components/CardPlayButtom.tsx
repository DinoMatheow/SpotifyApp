
import { PauseIcon, PlayIcon } from './Player';
import { usePlayerStore } from '../store/playerStore';

export const CardPlayButtom = ({id}: {id: string}) => {

    const { currentMusic, setCurrentMusic, isPlaying, setIsPlaying }  = usePlayerStore(state => state)

    const handleClick = () => {
        setCurrentMusic({
            playlist: {
                id: id
            },
            song: null,
            songs: []
        });
        setIsPlaying(!isPlaying);
    };

    const isPlayingPlaylist = isPlaying && currentMusic.playlist?.id === id;

  return (
    <button onClick={handleClick} className="card-play-button rounded-full bg-green-500 p-3">
        {isPlayingPlaylist ? <PauseIcon /> : <PlayIcon /> }
    </button>
  )
}
