import { Client } from "./baseClient";
import { Channel, BaseStream } from "../../types";
import { calcTTL, FetchWindow } from "../utils";

// TODO: Do not use api key
export class YoutubeClient extends Client {
  // streamerMaster may list a channel by "@handle" instead of its UC id;
  // the handle stays the canonical id in idMap, so map both ways here.
  private channelIdMap = new Map<string, string>();
  private keyByChannelId = new Map<string, string>();

  constructor(private apiKey: string) {
    super("youtube");
  }

  private async resolveHandles(userIds: string[]): Promise<void> {
    const token = await this.getToken();
    await Promise.all(
      userIds
        .filter((id) => id.startsWith("@") && !this.channelIdMap.has(id))
        .map(async (handle) => {
          const query = new URLSearchParams({
            key: token,
            part: "id",
            forHandle: handle,
          });
          const response = await fetch(
            `https://www.googleapis.com/youtube/v3/channels?${query}`,
          );
          if (!response.ok) return;
          const body = await response.json();
          const channelId = body.items?.[0]?.id;
          if (!channelId) return;
          this.channelIdMap.set(handle, channelId);
          this.keyByChannelId.set(channelId, handle);
        }),
    );
  }

  private toChannelId(userId: string): string | undefined {
    return userId.startsWith("@") ? this.channelIdMap.get(userId) : userId;
  }

  private toKey(channelId: string): string {
    return this.keyByChannelId.get(channelId) ?? channelId;
  }

  protected override async generateToken(): Promise<string> {
    return this.apiKey;
  }

  override async getChannels(userIds: string[]): Promise<Channel[]> {
    if (!userIds.length) return [];

    await this.resolveHandles(userIds);
    const channelIds = userIds.flatMap((id) => this.toChannelId(id) ?? []);

    const createRequest = (token: string) => {
      const query = new URLSearchParams({
        key: token,
        part: ["snippet", "contentDetails"].join(","),
        id: channelIds.join(","),
      });
      return new Request(
        `https://www.googleapis.com/youtube/v3/channels?${query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    };

    const bodies = await this.request(createRequest);

    return bodies.items.map((v: any) => ({
      id: this.toKey(v.id),
      name: v.snippet.title,
      icon: v.snippet.thumbnails.default.url,
      platform: "youtube",
    }));
  }

  override async getStreams(
    userIds: string[],
    window: FetchWindow,
  ): Promise<BaseStream[]> {
    if (!userIds.length) return [];

    const _token = await this.getToken();
    await this.resolveHandles(userIds);

    // アップロード済み動画から最新動画50本取得 (±7日のウィンドウをカバーするため)
    const plRequests = userIds.flatMap((userId) => {
      const id = this.toChannelId(userId);
      if (!id) return [];
      // ChannelIdの2文字目を'U'にするとそのチャンネルのuploadedPlaylistIdになる
      const playlistId = id.replace(/(?<=^.{1})./, "U");
      const query = new URLSearchParams({
        key: _token,
        part: "snippet",
        playlistId,
        maxResults: "50",
      });

      const request = new Request(
        `https://www.googleapis.com/youtube/v3/playlistItems?${query}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      return [fetch(request)];
    });

    const plResponses = await Promise.all(plRequests);
    const plResults = await Promise.all(
      plResponses.filter((r) => r.ok).map((r) => r.json()),
    );
    const uploadedVideosMap = new Map<string, any>(
      plResults.flatMap((v: any) =>
        v.items.map((item: any) => [
          item.snippet.resourceId.videoId,
          {
            id: item.snippet.resourceId.videoId,
            channelId: this.toKey(item.snippet.channelId),
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium.url,
            url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
            platform: "youtube",
          },
        ]),
      ),
    );

    // 動画idからstatus+liveStreamDetailを取得
    const maxVideoResults = 50;
    const videoIds = [...uploadedVideosMap.keys()];
    const vRequests = Array.from(
      { length: Math.ceil(videoIds.length / maxVideoResults) },
      (_, i) => {
        const query = new URLSearchParams([
          ["key", _token],
          ...["liveStreamingDetails", "status"].map((v) => ["part", v]),
          ...videoIds
            .slice(i * maxVideoResults, (i + 1) * maxVideoResults)
            .map((v) => ["id", v]),
        ]);

        const request = new Request(
          `https://www.googleapis.com/youtube/v3/videos?${query}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        return fetch(request);
      },
    );

    const vResponses = await Promise.all(vRequests);
    const vResults = await Promise.all(
      vResponses.filter((r) => r.ok).map((r) => r.json()),
    );
    return vResults.flatMap((j) =>
      j.items
        .filter((item: any) => {
          const scheduledStartTime =
            item.liveStreamingDetails?.scheduledStartTime;
          if (scheduledStartTime == null) return false; // not a live broadcast

          const scheduled = new Date(scheduledStartTime);
          return scheduled >= window.start && scheduled <= window.end;
        })
        .map((item: any) => ({
          ...uploadedVideosMap.get(item.id),
          scheduledStartTime: item.liveStreamingDetails.scheduledStartTime,
          startTime: item.liveStreamingDetails.actualStartTime,
          endTime: item.liveStreamingDetails.actualEndTime,
          ttl: calcTTL(item.liveStreamingDetails.scheduledStartTime, 7),
        })),
    );
  }
}
