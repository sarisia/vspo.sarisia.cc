import { Stream, Streamer } from "@types";
import { createContext } from "react";

export type VspoHistory = {
  loadOlderHistory: () => void;
};

export const vspoStreamContext = createContext<Stream[]>([]);
export const vspoStreamerContext = createContext<Streamer[]>([]);
export const vspoHistoryContext = createContext<VspoHistory>({
  loadOlderHistory: () => {},
});
