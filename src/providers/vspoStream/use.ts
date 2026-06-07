import { useContext } from "react";
import {
  vspoHistoryContext,
  vspoStreamContext,
  vspoStreamerContext,
} from "./context";

export const useVspoStream = () => useContext(vspoStreamContext);
export const useVspoStreamer = () => useContext(vspoStreamerContext);
export const useVspoHistory = () => useContext(vspoHistoryContext);
