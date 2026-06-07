/**
 * Generates mock data for local development.
 * Writes public/data/streams.json and public/data/streamers.json
 * with timestamps relative to the current time.
 *
 * Usage: node scripts/generateMockData.mjs
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/data");
mkdirSync(outDir, { recursive: true });

const now = new Date();
const t = (offsetMinutes) =>
  new Date(now.getTime() + offsetMinutes * 60 * 1000).toISOString();

// ── Streamers ─────────────────────────────────────────────────────────────────

const streamers = {
  mock_streamer_a: {
    youtube: {
      id: "UC_mock_yt_a",
      name: "Alice Ch. / アリス",
      icon: "https://placehold.co/96x96?text=A",
      platform: "youtube",
    },
    twitch: {
      id: "111111111",
      name: "alice_vspo",
      icon: "https://placehold.co/96x96?text=A",
      platform: "twitch",
    },
    order: 1,
  },
  mock_streamer_b: {
    youtube: {
      id: "UC_mock_yt_b",
      name: "Bob Ch. / ボブ",
      icon: "https://placehold.co/96x96?text=B",
      platform: "youtube",
    },
    order: 2,
  },
  mock_streamer_c: {
    twitCasting: {
      id: "carol_vspo",
      name: "Carol Ch. / キャロル",
      icon: "https://placehold.co/96x96?text=C",
      platform: "twitCasting",
    },
    order: 3,
  },
  mock_streamer_d: {
    youtube: {
      id: "UC_mock_yt_d",
      name: "Dave Ch. / デイブ",
      icon: "https://placehold.co/96x96?text=D",
      platform: "youtube",
    },
    twitch: {
      id: "222222222",
      name: "dave_vspo",
      icon: "https://placehold.co/96x96?text=D",
      platform: "twitch",
    },
    order: 4,
  },
};

// ── Streams ───────────────────────────────────────────────────────────────────
// Mix of: live (no endTime), upcoming, and one ended stream (for history toggle)

const streams = [
  // Currently live — YouTube (started 30 min ago, no endTime)
  {
    id: "yt_live_001",
    streamerId: "mock_streamer_a",
    channelId: "UC_mock_yt_a",
    platform: "youtube",
    title: "【LIVE】朝ゲー配信！マイクラ建築",
    thumbnail: "https://placehold.co/320x180?text=LIVE+YT",
    url: "https://www.youtube.com/watch?v=mock001",
    scheduledStartTime: t(-30),
    startTime: t(-28),
    ttl: t(60 * 24 * 7),
  },

  // Currently live — Twitch (started 45 min ago, no endTime)
  {
    id: "twitch_live_001",
    streamerId: "mock_streamer_a",
    channelId: "111111111",
    platform: "twitch",
    title: "【Twitch LIVE】雑談枠 ！コメ読む",
    thumbnail: "https://placehold.co/320x180?text=LIVE+TW",
    url: "https://www.twitch.tv/alice_vspo",
    scheduledStartTime: t(-45),
    startTime: t(-45),
    ttl: t(60 * 24 * 7),
  },

  // Currently live — TwitCasting
  {
    id: "twitcast_live_001",
    streamerId: "mock_streamer_c",
    channelId: "carol_vspo",
    platform: "twitCasting",
    title: "ツイキャス生放送！",
    thumbnail: "https://placehold.co/320x180?text=LIVE+TC",
    url: "https://twitcasting.tv/carol_vspo/movie/mock001",
    scheduledStartTime: t(-15),
    startTime: t(-15),
    ttl: t(60 * 24 * 7),
  },

  // Upcoming in 1 hour — YouTube
  {
    id: "yt_upcoming_001",
    streamerId: "mock_streamer_b",
    channelId: "UC_mock_yt_b",
    platform: "youtube",
    title: "【予定】昼ゲー！APEX大会練習",
    thumbnail: "https://placehold.co/320x180?text=UPCOMING",
    url: "https://www.youtube.com/watch?v=mock002",
    scheduledStartTime: t(60),
    ttl: t(60 * 24 * 7 + 60),
  },

  // Upcoming in 3 hours — YouTube
  {
    id: "yt_upcoming_002",
    streamerId: "mock_streamer_d",
    channelId: "UC_mock_yt_d",
    platform: "youtube",
    title: "【予定】深夜雑談配信〜",
    thumbnail: "https://placehold.co/320x180?text=UPCOMING+2",
    url: "https://www.youtube.com/watch?v=mock003",
    scheduledStartTime: t(180),
    ttl: t(60 * 24 * 7 + 180),
  },

  // Upcoming tomorrow — Twitch
  {
    id: "twitch_upcoming_001",
    streamerId: "mock_streamer_d",
    channelId: "222222222",
    platform: "twitch",
    title: "【明日】コラボ配信！",
    thumbnail: "https://placehold.co/320x180?text=TOMORROW",
    url: "https://www.twitch.tv/dave_vspo",
    scheduledStartTime: t(60 * 24),
    ttl: t(60 * 24 * 8),
  },

  // Ended 2 hours ago — only visible when "show history" is on
  {
    id: "yt_ended_001",
    streamerId: "mock_streamer_b",
    channelId: "UC_mock_yt_b",
    platform: "youtube",
    title: "【アーカイブ】昨日の配信",
    thumbnail: "https://placehold.co/320x180?text=ENDED",
    url: "https://www.youtube.com/watch?v=mock_ended_001",
    scheduledStartTime: t(-180),
    startTime: t(-178),
    endTime: t(-60),
    ttl: t(60 * 24 * 7 - 180),
  },
];

// ── Write ─────────────────────────────────────────────────────────────────────

writeFileSync(
  join(outDir, "streamers.json"),
  JSON.stringify(streamers, null, 2),
  "utf-8"
);
writeFileSync(
  join(outDir, "streams.json"),
  JSON.stringify(streams, null, 2),
  "utf-8"
);

console.log(
  `Mock data written to ${outDir}\n` +
    `  streamers: ${Object.keys(streamers).length}\n` +
    `  streams:   ${streams.length} (${streams.filter((s) => !s.endTime).length} live/upcoming, 1 ended)`
);
