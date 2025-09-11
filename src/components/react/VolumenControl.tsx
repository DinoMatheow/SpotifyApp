import { Slider } from "@/components/ui/slider";
import { VolumeIcon } from "@/icons/VolumeIcons";
import { useVolumenControl } from "@/hooks/useVolumenContro";

export const VolumenControl = ()=>{

    const { volume, setVolume, handleClickVolumen } = useVolumenControl();

    return (
        <div className="flex justify-center gap-x-2 text-white">
            <button className="opacity-70 hover:opacity-100 transition" onClick={handleClickVolumen}>
            <VolumeIcon volume={volume} />
            </button>
            <Slider 
            defaultValue={[100]}
            value={[volume * 100]}
            max={100}
            min={0}
            className="w-[95px]"
            onValueChange={(value)=> {
    
                const [newVolume] = value
                const volumenValue = newVolume / 100
                setVolume(volumenValue)
    
            }}
            />

        </div>
    )

};
