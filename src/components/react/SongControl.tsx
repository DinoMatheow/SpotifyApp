import { useSongControl } from "@/hooks/useSongControl";
import { Slider } from "@/components/ui/slider";

export const SongControl =({audio}:{ audio: HTMLAudioElement | null })=>{
    
    const {  currentTime, duration, formatDuration } = useSongControl({audio});

    return (
        <div className="flex gap-x-3 text-xs">
            <span className="opacity-50 w-12 text-right">{ formatDuration(currentTime) }</span>
            <Slider 
            defaultValue={[0]}
            value={[currentTime]}
            max={duration}
            min={0}
            className="w-[450px]"
            onValueChange={(value)=> {
                audio!.currentTime = value[0]
            }}
            />
            <span className="opacity-50 w-12">{duration ? formatDuration(duration): null }</span>
        </div>
    )

};