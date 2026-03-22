import { Redis } from "@upstash/redis";
import type { Player, RoundRecord } from "./gameStore";

export interface GameResult {
  id: string;
  roomCode: string;
  playedAt: string;
  players: Player[];
  scores: Record<string, number>;
  // ------------ player id of the winner, or null for a draw ------------
  winner: string | null;
  rounds: RoundRecord[];
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEY = "hire-knob:results";

export async function saveResult(result: GameResult): Promise<void> {
  await redis.lpush(KEY, result);
}

export async function getAllResults(): Promise<GameResult[]> {
  const items = await redis.lrange<GameResult>(KEY, 0, -1);
  return items;
}
