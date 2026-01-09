import { useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useSettings, useSettingDispatch, Setting } from "@/providers/setting";
import { Streamer } from "@types";

type Props = Record<string, never>;

export function useSettingMenu(_props?: Props) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery({ query: "(min-width: 768px)" });

  const dispatch = useSettingDispatch();
  const settings = useSettings();

  const theme = {
    state: settings.theme,
    options: ["system", "light", "dark"] as Setting["theme"][],
    onSelect: (v: Setting["theme"]) => {
      dispatch({ target: "theme", payload: v });
    },
  };
  const isMarqueeTitle = {
    state: settings.isMarqueeTitle,
    onChange: (v: Setting["isMarqueeTitle"]) => {
      dispatch({ target: "isMarqueeTitle", payload: v });
    },
  };
  const isDisplayHistory = {
    state: settings.isDisplayHistory,
    onChange: (v: Setting["isDisplayHistory"]) => {
      dispatch({ target: "isDisplayHistory", payload: v });
    },
  };
  const streamer = {
    state: settings.filteredStreamerIds,
  };

  function selectStreamer(id: Streamer["id"], isSelect: boolean) {
    dispatch({
      target: "filteredStreamerIds",
      payload: [id],
      type: isSelect ? "delete" : "add",
    });
  }

  function clearStreamer() {
    dispatch({
      target: "filteredStreamerIds",
      type: "clear",
    });
  }

  return {
    isDesktop,
    open,
    setOpen,
    theme,
    isMarqueeTitle,
    isDisplayHistory,
    streamer,
    selectStreamer,
    clearStreamer,
  };
}
