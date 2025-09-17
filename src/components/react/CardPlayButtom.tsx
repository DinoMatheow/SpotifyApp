import { PlayIcon } from '../../icons/PlayIcon';
import { PauseIcon } from '@/icons/PauseIcon';
import { usePlayerStore } from '../../store/playerStore';
import type { Playlist, Song } from '../../lib/data';

interface CardPlayButtomProps {
  playlist: Playlist;
  songs: Song[];
  size?: 'small' | 'large';
}

export const CardPlayButtom = ({ playlist, songs, size = 'small' }: CardPlayButtomProps) => {
  const { currentMusic, setCurrentMusic, isPlaying, setIsPlaying } = usePlayerStore(state => state);

  const isPlayingPlaylist = isPlaying && currentMusic.playlist?.id === playlist.id;

  const handleClick = () => {
    if (isPlayingPlaylist) {
      setIsPlaying(false);
      return;
    }

    setCurrentMusic({ songs, playlist, song: songs[0] });
    setIsPlaying(true);

    console.log({ playlist, songs });
  };

  const iconsClassName = size === 'small' ? 'w-5 h-5' : 'w-7 h-7';

  return (
    <button
      onClick={handleClick}
      className="card-play-button rounded-full bg-green-500 p-3 hover:scale-[1.0] transition hover:bg-green-400"
    >
      {isPlayingPlaylist ? <PauseIcon className={iconsClassName} /> : <PlayIcon className={iconsClassName} />}
    </button>
  );
};
