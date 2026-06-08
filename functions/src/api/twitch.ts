import { Client } from "./baseClient";
import { BaseStream, Channel, Config } from "../../types";
import { calcTTL, FetchWindow } from "../utils";

export class TwitchClient extends Client {
  private clientId: string;
  private clientSecret: string;
  // Twitch's archive/schedule endpoints key on the numeric broadcaster id,
  // but streamerMaster (and thus idMap) identifies channels by login —
  // remember the login → numeric id mapping from getChannels.
  private userIdMap = new Map<string, string>();

  constructor(config: Config["twitch"]) {
    super("twitch");
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
  }

  setThumbnailSize(url: string) {
    return url.replace(/%?{width}/, "320").replace(/%?{height}/, "180");
  }

  protected override async generateToken(): Promise<string> {
    const query = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
    });
    const request = new Request(`https://id.twitch.tv/oauth2/token?${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const response = await fetch(request);

    if (!response.ok)
      throw new Error(
        `generateToken request failed. ${response.status}:${response.statusText}`,
      );

    const { ["access_token"]: token } = await response.json();

    await this.setToken(token);
    return token;
  }

  override async getChannels(userIds: string[]): Promise<Channel[]> {
    if (!userIds.length) return [];

    const createRequest = (token: string) => {
      const query = new URLSearchParams(userIds.map((id) => ["login", id]));
      return new Request(`https://api.twitch.tv/helix/users?${query}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": this.clientId,
          "Content-Type": "application/json",
        },
      });
    };

    const bodies = await this.request(createRequest);

    return bodies.data.map((v: any) => {
      // streamerMaster identifies Twitch channels by login name, not the
      // numeric user id — keep that as the canonical id so it round-trips
      // through idMap in main.ts. The numeric id is still needed for the
      // archive/schedule endpoints used in getStreams, so remember it here.
      this.userIdMap.set(v.login, v.id);

      return {
        id: v.login,
        name: v.display_name,
        icon: v.profile_image_url,
        platform: "twitch",
      };
    });
  }

  override async getStreams(
    userIds: string[],
    window: FetchWindow,
  ): Promise<BaseStream[]> {
    if (!userIds.length) return [];

    const token = await this.getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      "Client-Id": this.clientId,
      "Content-Type": "application/json",
    };

    const [liveStreams, pastStreams, futureStreams] = await Promise.all([
      this.getLiveStreams(userIds, headers),
      this.getPastStreams(userIds, headers, window),
      this.getFutureStreams(userIds, headers, window),
    ]);

    return [...liveStreams, ...pastStreams, ...futureStreams];
  }

  private async getLiveStreams(
    userIds: string[],
    headers: Record<string, string>,
  ): Promise<BaseStream[]> {
    const query = new URLSearchParams([
      ["first", `${userIds.length}`],
      ...userIds.map((id) => ["user_login", id]),
    ]);
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?${query}`,
      { method: "GET", headers },
    );
    if (!response.ok) return [];

    const body = await response.json();

    return body.data.map((v: any) => ({
      id: v.id,
      // see getChannels — login is the canonical id used in idMap
      channelId: v.user_login,
      title: v.title,
      thumbnail: this.setThumbnailSize(v.thumbnail_url),
      url: `https://www.twitch.tv/${v.user_login}`,
      scheduledStartTime: v.started_at,
      startTime: v.started_at,
      platform: "twitch",
      ttl: calcTTL(v.started_at, 7),
    }));
  }

  // Past 7 days: archived broadcasts via helix/videos?type=archive (keyed by
  // numeric broadcaster id). 404/empty responses (no VODs) are tolerated.
  private async getPastStreams(
    userIds: string[],
    headers: Record<string, string>,
    window: FetchWindow,
  ): Promise<BaseStream[]> {
    const requests = userIds.flatMap((login) => {
      const userId = this.userIdMap.get(login);
      if (!userId) return [];

      const query = new URLSearchParams([
        ["user_id", userId],
        ["type", "archive"],
        ["first", "20"],
      ]);
      return [
        fetch(`https://api.twitch.tv/helix/videos?${query}`, {
          method: "GET",
          headers,
        }).then(async (response) => {
          if (!response.ok) return [];
          const body = await response.json();
          return (body.data ?? []).map((v: any) => ({ ...v, login }));
        }),
      ];
    });

    const results = await Promise.all(requests);

    return results.flat().flatMap((v: any) => {
      const published = new Date(v.published_at);
      if (published < window.start || published > window.end) return [];

      return [
        {
          id: v.stream_id ?? v.id,
          channelId: v.login,
          title: v.title,
          thumbnail: this.setThumbnailSize(v.thumbnail_url),
          url: v.url,
          scheduledStartTime: v.published_at,
          startTime: v.published_at,
          platform: "twitch",
          ttl: calcTTL(v.published_at, 7),
        } as BaseStream,
      ];
    });
  }

  // Future 7 days: scheduled segments via helix/schedule (keyed by numeric
  // broadcaster id). Channels without a published schedule 404 — tolerated.
  private async getFutureStreams(
    userIds: string[],
    headers: Record<string, string>,
    window: FetchWindow,
  ): Promise<BaseStream[]> {
    const requests = userIds.flatMap((login) => {
      const userId = this.userIdMap.get(login);
      if (!userId) return [];

      const query = new URLSearchParams([["broadcaster_id", userId]]);
      return [
        fetch(`https://api.twitch.tv/helix/schedule?${query}`, {
          method: "GET",
          headers,
        }).then(async (response) => {
          if (!response.ok) return [];
          const body = await response.json();
          return (body.data?.segments ?? []).map((v: any) => ({
            ...v,
            login,
          }));
        }),
      ];
    });

    const results = await Promise.all(requests);

    return results.flat().flatMap((v: any) => {
      const start = new Date(v.start_time);
      if (start < window.start || start > window.end) return [];

      return [
        {
          id: v.id,
          channelId: v.login,
          title: v.title,
          // schedule segments don't carry a thumbnail/url — fall back to the
          // channel page until the stream goes live and surfaces elsewhere.
          thumbnail: "",
          url: `https://www.twitch.tv/${v.login}`,
          scheduledStartTime: v.start_time,
          startTime: v.start_time,
          platform: "twitch",
          ttl: calcTTL(v.start_time, 7),
        } as BaseStream,
      ];
    });
  }

  async updateStreamToVideo<T extends BaseStream>(stream: T): Promise<T> {
    const createRequest = (token: string) => {
      const query = new URLSearchParams([
        ["user_id", stream.channelId],
        ["type", "archive"],
        ["first", "1"],
      ]);
      return new Request(`https://api.twitch.tv/helix/videos?${query}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Client-Id": this.clientId,
          "Content-Type": "application/json",
        },
      });
    };

    const result = await this.request(createRequest);
    const video = result.data.shift();

    if (stream.id !== video.stream_id) throw new Error("can not updated.");

    return {
      ...stream,
      url: video.url,
      thumbnail: this.setThumbnailSize(video.thumbnail_url),
    };
  }
}
