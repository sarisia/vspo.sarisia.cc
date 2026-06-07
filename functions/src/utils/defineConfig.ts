import { Config } from "../../types";

export const defineConfig = (): Config => ({
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY ?? "",
  },
  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID ?? "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET ?? "",
  },
  twitCasting: {
    accessToken: process.env.TWITCASTING_ACCESS_TOKEN ?? "",
  },
});
