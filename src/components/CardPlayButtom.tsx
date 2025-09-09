
import { PauseIcon, PlayIcon } from './Player';
import { usePlayerStore } from '../store/playerStore';

export const CardPlayButtom = ({id}: {id: string}) => {

    const { currentMusic, setCurrentMusic, isPlaying, setIsPlaying }  = usePlayerStore(state => state)

    const handleClick = () => {
        if(isPlayingPlaylist){
            setIsPlaying(false)
            return
        }
        fetch(`/api/get-info-playlist.json?id=${id}`)
        .then(res=> res.json())
        .then(data =>{
         const { songs, playlist } = data
         setIsPlaying(true);
         setCurrentMusic( {songs, playlist, song: songs[0]} )

         console.log({playlist, songs})
        })
        
    };

    const isPlayingPlaylist = isPlaying && currentMusic.playlist?.id === id;

  return (
    <button onClick={handleClick} className="card-play-button rounded-full bg-green-500 p-3">
        {isPlayingPlaylist ? <PauseIcon /> : <PlayIcon /> }
    </button>
  )
}
