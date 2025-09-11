
import {  PlayIcon } from '../../icons/PlayIcon';
import { PauseIcon } from '@/icons/PauseIcon';
import { usePlayerStore } from '../../store/playerStore';

export const CardPlayButtom = ({id, size = 'small'}: {id: string, size: string}) => {

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

     const iconsClassName = size === 'small' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <button onClick={handleClick} className="card-play-button rounded-full bg-green-500 p-3
      hover:scale-[1.0] transition hover:bg-green-400">
        {isPlayingPlaylist ? <PauseIcon className={iconsClassName}  /> : <PlayIcon className={iconsClassName} /> }
    </button>
  )
}
