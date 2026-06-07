import {
  Channel,
  ChannelResponse,
  Stream,
  Streamer,
  StreamerMap,
  StreamerResponse,
  StreamResponse,
} from "@types";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { vspoStreamContext, vspoStreamerContext } from "./context";
import { useSettings } from "../setting";

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

  useEffect(() => {
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/streams.json`).then((r) =>
        r.json()
      ),
      fetch(`${import.meta.env.BASE_URL}data/streamers.json`).then((r) =>
        r.json()
      ),
    ])
      .then(
        ([streams, streamers]: [
          StreamResponse[],
          Record<string, StreamerResponse>,
        ]) => {
          setStreamsResponse(streams);
          setStreamerMap(
            Object.fromEntries(
              Object.entries(streamers).map(([id, d]) => [
                id,
                parseToStreamer(id, d),
              ])
            )
          );
        }
      )
      .catch((e) => console.error("failed to load data", e));
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

      // filter by title
      if (
        titleFilterLower !== "" &&
        !streamRes.title.toLowerCase().includes(titleFilterLower)
      ) {
        return results;
      }

      return results.concat(parseToStream(streamRes, channel));
    }, []);
  }, [streamResponses, streamerMap, filteredStreamerIds, filteredTitle]);

  const streamers = useMemo<Streamer[]>(
    () => Object.values(streamerMap),
    [streamerMap]
  );

  return (
    <vspoStreamContext.Provider value={streams}>
      <vspoStreamerContext.Provider value={streamers}>
        {children}
      </vspoStreamerContext.Provider>
    </vspoStreamContext.Provider>
  );
};
