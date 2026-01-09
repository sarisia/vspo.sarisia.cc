import { cn } from "@/lib/utils";
import { Main } from "./main";
import { useSettingMenu } from "../viewModel";

type Props = Omit<
  ReturnType<typeof useSettingMenu>,
  "isDesktop" | "open" | "setOpen" | "goBack"
> & { className?: string };

export function Content({
  className,
  selectStreamer,
  clearStreamer,
  ...props
}: Props) {
  return (
    <div className={cn("w-full space-y-6", className)}>
      <Main
        {...props}
        onClickIcon={selectStreamer}
        onClickClear={clearStreamer}
      />
    </div>
  );
}
