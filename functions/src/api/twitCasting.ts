import { Client } from "./baseClient";
import { BaseStream, Channel } from "../../types";
import { calcTTL, FetchWindow } from "../utils";

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

    // One bad/renamed screen id must not drop every TwitCasting channel.
    const bodies = await Promise.all(
      responses.filter((r) => r.ok).map((r) => r.json()),
    );

    return bodies.map((v) => ({
      id: v.user.screen_id,
      name: v.user.name,
      icon: v.user.image,
      platform: "twitCasting",
    }));
  }

  override async getStreams(
    userIds: string[],
    window: FetchWindow,
  ): Promise<BaseStream[]> {
    if (!userIds.length) return [];

    const token = await this.getToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "X-Api-Version": "2.0",
    };

    const [liveStreams, pastStreams] = await Promise.all([
      this.getLiveStreams(userIds, headers),
      this.getPastStreams(userIds, headers, window),
    ]);

    return [...liveStreams, ...pastStreams];
  }

  private async getLiveStreams(
    userIds: string[],
    headers: Record<string, string>,
  ): Promise<BaseStream[]> {
    const requests = userIds.map((id) =>
      fetch(`https://apiv2.twitcasting.tv/users/${id}/current_live`, {
        method: "GET",
        headers,
      }).then(async (response) =>
        response.ok ? [{ ...(await response.json()), screenId: id }] : [],
      ),
    );

    const bodies = (await Promise.all(requests)).flat();

    return bodies.map((v) => {
      const startTime = new Date(v.movie.created * 1000).toISOString();

      return {
        id: v.movie.id,
        // movie.user_id is the numeric id; idMap keys on screen_id
        channelId: v.screenId,
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

  // Past 7 days: finished broadcasts via /users/{id}/movies. TwitCasting has
  // no public schedule API, so there is no future-window equivalent here.
  private async getPastStreams(
    userIds: string[],
    headers: Record<string, string>,
    window: FetchWindow,
  ): Promise<BaseStream[]> {
    const requests = userIds.map((id) =>
      fetch(`https://apiv2.twitcasting.tv/users/${id}/movies?limit=20`, {
        method: "GET",
        headers,
      }).then(async (response) => {
        if (!response.ok) return [];
        const body = await response.json();
        return (body.movies ?? []).map((v: any) => ({ ...v, screenId: id }));
      }),
    );

    const results = await Promise.all(requests);

    return results.flat().flatMap((v: any) => {
      const startTime = new Date(v.created * 1000);
      if (startTime < window.start || startTime > window.end) return [];

      const startTimeIso = startTime.toISOString();
      return [
        {
          id: v.id,
          channelId: v.screenId,
          title: v.title,
          thumbnail: v.large_thumbnail,
          url: v.link,
          scheduledStartTime: startTimeIso,
          startTime: startTimeIso,
          endTime: v.is_live
            ? undefined
            : new Date((v.created + v.duration) * 1000).toISOString(),
          platform: "twitCasting",
          ttl: calcTTL(startTimeIso, 7),
        } as BaseStream,
      ];
    });
  }
}
