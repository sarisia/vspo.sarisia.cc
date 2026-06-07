import { Client } from "./baseClient";
import { BaseStream, Channel } from "../../types";
import { calcTTL } from "../utils";

export class TwitCastingClient extends Client {
  private accessToken: string;

  constructor(accessToken: string) {
    super("twitCasting");
    this.accessToken = accessToken;
  }

  protected override async generateToken(): Promise<string> {
    return this.accessToken;
  }

  override async getChannels(userIds: string[]): Promise<Channel[]> {
    if (!userIds.length) return [];

    const token = await this.getToken();

    const requests = userIds.map((id) => {
      const createRequest = (token: string) => {
        return new Request(`https://apiv2.twitcasting.tv/users/${id}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "X-Api-Version": "2.0",
          },
        });
      };

      return fetch(createRequest(token));
    });

    const responses = await Promise.all(requests);

    if (responses.some((r) => !r.ok)) return [];

    const bodies = await Promise.all(responses.map((r) => r.json()));

    return bodies.map((v) => ({
      id: v.user.screen_id,
      name: v.user.name,
      icon: v.user.image,
      platform: "twitCasting",
    }));
  }

  override async getStreams(userIds: string[]): Promise<BaseStream[]> {
    if (!userIds.length) return [];

    const token = await this.getToken();

    const requests = userIds.map((id) => {
      const createRequest = (token: string) => {
        return new Request(
          `https://apiv2.twitcasting.tv/users/${id}/current_live`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
              "X-Api-Version": "2.0",
            },
          },
        );
      };

      return fetch(createRequest(token));
    });

    const responses = await Promise.all(requests);

    if (responses.some((r) => !r.ok)) return [];

    const bodies = await Promise.all(responses.map((r) => r.json()));

    return bodies.map((v) => {
      const startTime = new Date(v.movie.created * 1000).toISOString();

      return {
        id: v.movie.id,
        channelId: v.movie.user_id,
        title: v.movie.title,
        thumbnail: v.movie.large_thumbnail,
        url: v.movie.link,
        scheduledStartTime: startTime,
        startTime,
        platform: "twitCasting",
        ttl: calcTTL(startTime, 7),
      };
    });
  }
}
