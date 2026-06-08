import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { YoutubeClient, TwitchClient, TwitCastingClient } from "./api";
import { defineConfig } from "./utils";
import { Platform, Stream } from "../types";
import masterData from "./streamerMaster.json";

type MasterEntry = {
  youtube?: string;
  twitch?: string;
  twitCasting?: string;
  order?: number;
};

type MasterRecord = Record<string, MasterEntry>;

const run = async () => {
  const config = defineConfig();
  const master = masterData as unknown as MasterRecord;

  // Build channel ID → streamer ID maps
  const idMap: Record<Platform, Map<string, string>> = {
    youtube: new Map(),
    twitch: new Map(),
    twitCasting: new Map(),
  };
  const baseStreamers: Record<string, { order: number }> = {};

  for (const [streamerId, entry] of Object.entries(master)) {
    if (entry.youtube) idMap.youtube.set(entry.youtube, streamerId);
    if (entry.twitch) idMap.twitch.set(entry.twitch, streamerId);
    if (entry.twitCasting) idMap.twitCasting.set(entry.twitCasting, streamerId);
    if (Number.isFinite(entry.order))
      baseStreamers[streamerId] = { order: entry.order as number };
  }

  const youtubeClient = new YoutubeClient(config.youtube.apiKey);
  const twitchClient = new TwitchClient(config.twitch);
  const twitClient = new TwitCastingClient(config.twitCasting.accessToken);

  // Get channels → assemble streamers map
  const [ytChannels, twitchChannels, twitCastChannels] = await Promise.all([
    youtubeClient.getChannels([...idMap.youtube.keys()]),
    twitchClient.getChannels([...idMap.twitch.keys()]),
    twitClient.getChannels([...idMap.twitCasting.keys()]),
  ]);

  const streamers = [
    ...ytChannels,
    ...twitchChannels,
    ...twitCastChannels,
  ].reduce(
    (result: Record<string, any>, ch) => {
      const key = idMap[ch.platform].get(ch.id);
      if (key) result[key] = { ...result[key], [ch.platform]: ch };
      return result;
    },
    { ...baseStreamers },
  );

  // The filter-UI icon comes from whichever channel's data is available —
  // not every streamer has all platforms (or even YouTube), so this can't
  // be hard-coded to one platform.
  for (const streamer of Object.values(streamers)) {
    streamer.icon =
      streamer.youtube?.icon ??
      streamer.twitch?.icon ??
      streamer.twitCasting?.icon;
  }

  // Get streams → attach streamerId
  const [ytStreams, twitchStreams, twitCastStreams] = await Promise.all([
    youtubeClient.getStreams([...idMap.youtube.keys()]),
    twitchClient.getStreams([...idMap.twitch.keys()]),
    twitClient.getStreams([...idMap.twitCasting.keys()]),
  ]);

  const streams: Stream[] = [
    ...ytStreams,
    ...twitchStreams,
    ...twitCastStreams,
  ].flatMap((stream) => {
    const streamerId = idMap[stream.platform].get(stream.channelId);
    if (!streamerId) return [];
    return [{ ...stream, streamerId }];
  });

  // Write output
  const outDir =
    process.env.DATA_OUT_DIR ?? join(__dirname, "../../data");
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    join(outDir, "streamers.json"),
    JSON.stringify(streamers, null, 2),
    "utf-8",
  );

  // Bucket streams by UTC date of scheduledStartTime, write per-date files
  const toUtcDate = (isoString: string) =>
    new Date(isoString).toISOString().slice(0, 10);

  const byDate = new Map<string, Stream[]>();
  for (const stream of streams) {
    const key = toUtcDate(stream.scheduledStartTime);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(stream);
  }

  const streamsDir = join(outDir, "streams");
  mkdirSync(streamsDir, { recursive: true });

  for (const [date, dateStreams] of byDate) {
    writeFileSync(
      join(streamsDir, `${date}.json`),
      JSON.stringify(dateStreams, null, 2),
      "utf-8",
    );
  }

  console.log(
    `Written ${streams.length} streams across ${byDate.size} date files, ${Object.keys(streamers).length} streamers to ${outDir}`,
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
