import {
  Channel,
  ChannelResponse,
  Stream,
  Streamer,
  StreamerMap,
  StreamerResponse,
  StreamResponse,
} from "@types";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  vspoHistoryContext,
  vspoStreamContext,
  vspoStreamerContext,
} from "./context";
import { useSettings } from "../setting";

const DAY_MS = 24 * 60 * 60 * 1000;

// How many days ahead (today inclusive) the default view fetches eagerly
const FORWARD_DAYS = 7;

// Date files are bucketed by UTC date (`YYYY-MM-DD`) of scheduledStartTime.
// UTC days are always 24h, so offsetting by milliseconds avoids local-time/DST drift.
const utcDate = (d: Date) => d.toISOString().slice(0, 10);

const dateFileUrl = (d: Date) =>
  `${import.meta.env.BASE_URL}data/streams/${utcDate(d)}.json`;

const fetchDateFile = async (d: Date): Promise<StreamResponse[]> => {
  const res = await fetch(dateFileUrl(d));
  // A missing date file should be treated as an empty day. On static hosting
  // (GitHub Pages) that's a real 404, but Vite's dev server answers unmatched
  // paths with a 200 HTML SPA-fallback — guard on content-type too so local
  // dev doesn't choke trying to JSON-parse an HTML body.
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/json")) {
    return [];
  }
  return res.json();
};

const parseToStream = (streamRes: StreamResponse, channel: Channel): Stream => {
  const endAt = streamRes.endTime ? new Date(streamRes.endTime) : undefined;

  return {
    id: streamRes.id,
    title: streamRes.title,
    thumbnail: streamRes.thumbnail,
    url: streamRes.url,
    streamerId: streamRes.streamerId,
    streamerName: channel.name,
    icon: channel.icon,
    platform: streamRes.platform,
    startAt: new Date(streamRes.scheduledStartTime),
    endAt,
  };
};

const parseToStreamer = (
  id: string,
  streamerRes: StreamerResponse
): Streamer => {
  const entries = Object.entries(streamerRes).map(([key, data]) => {
    if (key === "order") return [key, data];

    const { id, name, icon } = data as ChannelResponse;
    return [key, { id, name, icon }];
  });

  return Object.fromEntries(entries.concat([["id", id]]));
};

export const VspoStreamProvider = ({ children }: { children: ReactNode }) => {
  const [streamResponses, setStreamsResponse] = useState<StreamResponse[]>([]);
  const [streamerMap, setStreamerMap] = useState<StreamerMap>({});
  const { filteredStreamerIds, filteredTitle } = useSettings();

  // How many days back from today have been revealed via "Load more" so far (0 = none yet)
  const oldestHistoryOffsetRef = useRef(0);

  // Eager load: today + the next FORWARD_DAYS days
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const streamers: Record<string, StreamerResponse> = await fetch(
        `${import.meta.env.BASE_URL}data/streamers.json`
      ).then((r) => r.json());
      if (cancelled) return;

      setStreamerMap(
        Object.fromEntries(
          Object.entries(streamers).map(([id, d]) => [
            id,
            parseToStreamer(id, d),
          ])
        )
      );

      const baseMs = Date.now();
      const days = Array.from(
        { length: FORWARD_DAYS + 1 },
        (_, i) => new Date(baseMs + i * DAY_MS)
      );
      const results = await Promise.all(days.map(fetchDateFile));
      if (cancelled) return;

      setStreamsResponse(results.flat());
    };

    load().catch((e) => console.error("failed to load data", e));

    return () => {
      cancelled = true;
    };
  }, []);

  // Load exactly one more older day per call (today-1, then today-2, ...).
  // An empty/missing day simply appends nothing — the button stays as-is,
  // no disabled/loading/"no more" state to track.
  const loadOlderHistory = useCallback(() => {
    oldestHistoryOffsetRef.current += 1;
    const offset = oldestHistoryOffsetRef.current;

    fetchDateFile(new Date(Date.now() - offset * DAY_MS))
      .then((dayStreams) => {
        if (dayStreams.length === 0) return;
        setStreamsResponse((prev) => [...prev, ...dayStreams]);
      })
      .catch((e) => console.error("failed to load history", e));
  }, []);

  const streams = useMemo<Stream[]>(() => {
    const titleFilterLower = filteredTitle.trim().toLowerCase();

    return streamResponses.reduce((results: Stream[], streamRes) => {
      const channel = streamerMap[streamRes.streamerId][streamRes.platform];

      if (!channel) {
        console.error(`streamerId is not found: ${streamRes.streamerId}`);
        return results;
      }

      // filter対象外
      if (
        filteredStreamerIds.length !== 0 &&
        !filteredStreamerIds.includes(streamRes.streamerId)
      ) {
        return results;
      }

      // filter by title (matches title, streamer name, platform, and URL)
      if (titleFilterLower !== "") {
        const searchable = [
          streamRes.title,
          channel.name,
          streamRes.platform,
          streamRes.url,
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(titleFilterLower)) {
          return results;
        }
      }

      return results.concat(parseToStream(streamRes, channel));
    }, []);
  }, [streamResponses, streamerMap, filteredStreamerIds, filteredTitle]);

  const streamers = useMemo<Streamer[]>(
    () => Object.values(streamerMap),
    [streamerMap]
  );

  const history = useMemo(() => ({ loadOlderHistory }), [loadOlderHistory]);

  return (
    <vspoStreamContext.Provider value={streams}>
      <vspoStreamerContext.Provider value={streamers}>
        <vspoHistoryContext.Provider value={history}>
          {children}
        </vspoHistoryContext.Provider>
      </vspoStreamerContext.Provider>
    </vspoStreamContext.Provider>
  );
};
