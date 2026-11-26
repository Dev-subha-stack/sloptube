import { createServerFn } from "@tanstack/react-start";

export const loadMiniVideo = createServerFn({ method: "GET" })
  .inputValidator((d: { v: string }) => d)
  .handler(async ({ data }) => {
    const { watchPageState } = await import("@/lib/watch/server");
    const state = await watchPageState(data.v);
    if (state.kind !== "ready") return { kind: "unavailable" as const };
    const { video, upNext, engagement } = state;
    return {
      kind: "ready" as const,
      player: {
        videoId: video.id,
        title: video.title,
        channelName: video.channel.name,
        src: video.src,
        poster: video.thumbnail,
        spriteVtt: video.spriteVtt,
        durationS: video.durationS,
        startAt: 0,
        engagement,
        nextVideoIds: upNext.map((item) => item.id),
      },
    };
  });