// The automatic content filter: a few stills from a video go to an AI vision
// model, which says whether they show sexual / explicit content. Server only.
import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

/** Only a very sure verdict removes a video and bans the uploader. */
export const BLOCK_CONFIDENCE = 0.85;

const Verdict = z.object({
  nsfw: z.boolean(),
  confidence: z.number(),
  reason: z.string(),
});
export type NsfwVerdict = z.infer<typeof Verdict>;

const INSTRUCTIONS =
  "You are the content filter for a public video site. You get still frames from one uploaded video. " +
  "Set nsfw to true only for pornography, sexual acts, exposed genitals, or exposed female nipples in a sexual context. " +
  "Swimwear, kissing, medical or educational images, art, violence and gore are NOT nsfw for this filter. " +
  "confidence is 0 to 1 for your nsfw answer. reason is one short sentence.";

export async function classifyFrames(frames: string[]): Promise<NsfwVerdict | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey || frames.length === 0) return null;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    system: INSTRUCTIONS,
    output: Output.object({ schema: Verdict }),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `Here are ${frames.length} frames from the video.` },
          ...frames.map((f) => ({ type: "image" as const, image: new URL(f) })),
        ],
      },
    ],
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    const out = await result.output;
    return Verdict.parse(out);
  } catch (err) {
    console.warn("nsfw filter: no verdict", err);
    return null;
  }
}

export function shouldBlock(v: NsfwVerdict | null): boolean {
  return v !== null && v.nsfw && v.confidence >= BLOCK_CONFIDENCE;
}

/** Removes the video and bans its uploader for good (database function, service role only). */
export async function removeAndBan(videoId: string, reason: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("auto_remove_nsfw", {
    video_id: videoId,
    reason: `Automatic filter: ${reason}`.slice(0, 500),
  });
  if (error) {
    console.error("nsfw filter: removal failed", error.message);
    return false;
  }
  return data === true;
}
