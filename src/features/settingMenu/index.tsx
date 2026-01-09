import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogMenu } from "./dialogMenu";
import { DrawerMenu } from "./drawerMenu";
import { useSettingMenu } from "./viewModel";
import { Content } from "./content";

type Props = {
  trigger: ReactNode;
} & Parameters<typeof useSettingMenu>[0];
export function SettingMenu({ trigger, ...props }: Props) {
  const { isDesktop, open, setOpen, ...rest } = useSettingMenu(props);

  if (isDesktop)
    return (
      <DialogMenu
        open={open}
        onOpenChange={setOpen}
        trigger={trigger}
        content={<Content {...rest} />}
      />
    );

  return (
    <DrawerMenu
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      content={<Content {...rest} className="px-4 pb-2" />}
      footer={
        <div className="w-full">
          <Button onClick={() => setOpen(false)}>Close</Button>
        </div>
      }
    />
  );
}
