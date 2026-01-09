import { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import {
  SwitchItem,
  SelectItem,
  Header,
} from "@/components/settingItem";
import { Setting } from "@/providers/setting";
import { StreamerFilter } from "./streamerFilter";

type MainProps = {
  theme: {
    state: Setting["theme"];
    options: Setting["theme"][];
    onSelect: (v: Setting["theme"]) => void;
  };
  isMarqueeTitle: {
    state: Setting["isMarqueeTitle"];
    onChange: (v: Setting["isMarqueeTitle"]) => void;
  };
  isDisplayHistory: {
    state: Setting["isDisplayHistory"];
    onChange: (v: Setting["isDisplayHistory"]) => void;
  };
  streamer: {
    state: Setting["filteredStreamerIds"];
  };
  onClickIcon: (id: string, isSelected: boolean) => void;
  onClickClear: () => void;
};

export function Main({
  className,
  theme,
  isMarqueeTitle,
  isDisplayHistory,
  streamer,
  onClickIcon,
  onClickClear,
  ...props
}: ComponentProps<"div"> & MainProps) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      <StreamerFilter
        ids={streamer.state}
        onClickIcon={onClickIcon}
        onClickClear={onClickClear}
      />
      <Header>Settings</Header>
      <div>
        <SelectItem
          label="Theme"
          value={theme.state}
          values={theme.options}
          onValueChange={theme.onSelect}
          className="rounded-t-xl border-b"
        />
        <SwitchItem
          label="Marquee"
          description="Make a marquee on the stream title"
          checked={isMarqueeTitle.state}
          onCheckedChange={isMarqueeTitle.onChange}
          className="border-b"
        />
        <SwitchItem
          label="History"
          description="Display finished streams"
          checked={isDisplayHistory.state}
          onCheckedChange={isDisplayHistory.onChange}
          className="rounded-b-xl"
        />
      </div>
    </div>
  );
}
