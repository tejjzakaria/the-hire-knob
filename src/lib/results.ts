import { Redis } from "@upstash/redis";
import type { Player, RoundRecord } from "./gameStore";

export interface GameResult {
  id: string;
  roomCode: string;
  playedAt: string;
  players: Player[];
  scores: Record<string, number>;
  winner: string | null;
  rounds: RoundRecord[];
}

// --------- redis -----------
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function saveResult(result: GameResult): Promise<void> {
  try {
    await redis.lpush("hire-knob:results", result);
  } catch {
    console.log("something went wrong");
  }
}

export async function getAllResults(): Promise<GameResult[]> {
  try {
    const items = await redis.lrange<GameResult>("hire-knob:results", 0, -1);
    return items;
  } catch {
    return [];
  }
}
