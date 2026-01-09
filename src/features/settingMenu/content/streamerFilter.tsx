import { Streamer } from "@types";
import { ComponentProps } from "react";
import { StreamerIconList } from "@/components/streamerIconList";
import { Header } from "@/components/settingItem";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type Props = Omit<ComponentProps<typeof StreamerIconList>, "renderIcon"> & {
  onClickIcon: (id: Streamer["id"], isSelected: boolean) => void;
  onClickClear: () => void;
} & ComponentProps<"div">;

export function StreamerFilter({
  ids = [],
  onClickIcon,
  onClickClear,
  ...props
}: Props) {
  const renderIcon = (streamer: Streamer) => {
    const isSelected = ids.includes(streamer.id);
    return (
      <button
        key={streamer.id}
        className="relative group"
        onClick={() => onClickIcon(streamer.id, isSelected)}
        type="button"
      >
        <div
          data-selected={isSelected}
          className="overflow-hidden rounded-xl border-2 data-[selected=true]:border-vspo-primary data-[selected=false]:border-transparent hover:scale-95 transition-all duration-150 shadow-sm"
        >
          <img
            src={streamer.youtube.icon}
            alt={streamer.youtube.name}
            className="w-full h-full object-cover"
          />
        </div>
      </button>
    );
  };

  return (
    <div {...props}>
      <div className="flex items-center justify-between mb-3">
        <Header>Filter by streamer</Header>
        {ids.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClickClear}
            className="h-7 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>
      <StreamerIconList
        renderIcon={renderIcon}
        className="grid grid-cols-5 gap-2"
      />
    </div>
  );
}
