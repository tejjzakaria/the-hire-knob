import { Redis } from "@upstash/redis";

export interface Player {
  id: string;
  name: string;
  slot: 1 | 2;
}

export interface RoundRecord {
  roundIndex: number;
  scenarioId: number;
  correctIndex: number;
  answers: Record<string, number | null>;
}

export interface Room {
  code: string;
  players: Player[];
  status: "lobby" | "playing" | "finished";
  currentRound: number;
  scenarioOrder: number[];
  scores: Record<string, number>;
  answers: Record<string, number | null>;
  revealed: boolean;
  roundStartTime: number;
  roundRecords: RoundRecord[];
  readyVotes: Set<string>;
  rematchVotes: Set<string>;
  skipVotes: Set<string>;
  lastHeartbeat: Record<string, number>;
}

// --------- serialization for Redis -----------
interface RoomJSON {
  code: string;
  players: Player[];
  status: "lobby" | "playing" | "finished";
  currentRound: number;
  scenarioOrder: number[];
  scores: Record<string, number>;
  answers: Record<string, number | null>;
  revealed: boolean;
  roundStartTime: number;
  roundRecords: RoundRecord[];
  readyVotes: string[];
  rematchVotes: string[];
  skipVotes: string[];
  lastHeartbeat: Record<string, number>;
}

function toJSON(room: Room): RoomJSON {
  return {
    ...room,
    readyVotes: Array.from(room.readyVotes),
    rematchVotes: Array.from(room.rematchVotes),
    skipVotes: Array.from(room.skipVotes),
  };
}

function fromJSON(data: RoomJSON): Room {
  return {
    ...data,
    readyVotes: new Set(data.readyVotes),
    rematchVotes: new Set(data.rematchVotes),
    skipVotes: new Set(data.skipVotes),
  };
}

// --------- Redis client -----------
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    }
  } catch { /* fall through */ }
  return null;
}

const ROOM_TTL = 3600; // 1 hour
function redisKey(code: string) { return `hire-knob:room:${code}`; }
function voteKey(type: string, code: string) { return `hire-knob:vote:${type}:${code}`; }

// Atomic vote using Redis SADD + SCARD.
// Returns true if this vote caused the threshold to be met (and claims the action).
async function atomicVote(key: string, playerId: string, required: number): Promise<boolean> {
  const r = getRedis();
  if (!r) return false; // in-memory fallback handled by caller
  try {
    await r.sadd(key, playerId);
    const count = await r.scard(key);
    if (count >= required) {
      // Claim the action: use setnx so only one caller wins the race
      const claimed = await r.set(`${key}:lock`, "1", { nx: true, ex: 10 });
      if (claimed) {
        await r.del(key, `${key}:lock`);
        return true;
      }
    }
    return false;
  } catch (e) {
    console.error("[gameStore] atomicVote failed:", e);
    return false;
  }
}

async function clearVote(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(key, `${key}:lock`);
  } catch { /* ignore */ }
}

// --------- in-memory cache -----------
const rooms = new Map<string, Room>();

async function persistRoom(room: Room): Promise<void> {
  rooms.set(room.code, room);
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(redisKey(room.code), JSON.stringify(toJSON(room)), { ex: ROOM_TTL });
  } catch (e) {
    console.error("[gameStore] Redis persist failed:", e);
  }
}

async function loadRoom(code: string): Promise<Room | undefined> {
  const r = getRedis();
  if (r) {
    // Always load from Redis for cross-instance consistency
    try {
      const raw = await r.get<string | RoomJSON>(redisKey(code));
      if (!raw) return rooms.get(code); // fallback if Redis key expired but memory has it
      const data: RoomJSON = typeof raw === "string" ? JSON.parse(raw) : raw;
      const room = fromJSON(data);
      rooms.set(code, room); // update local cache
      return room;
    } catch (e) {
      console.error("[gameStore] Redis load failed:", e);
      // fall through to memory
    }
  }
  return rooms.get(code);
}

// --------- public API (all async now) -----------

export function generateCode(): string {
  let code: string;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

export async function createRoom(
  code: string,
  player: Player,
  scenarioCount: number
): Promise<Room> {
  const arr = Array.from({ length: scenarioCount }, (_, i) => i);
  let state = 0;
  for (let i = 0; i < code.length; i++) {
    state = (Math.imul(state, 31) + code.charCodeAt(i)) | 0;
  }
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    const j = Math.abs(state) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  const room: Room = {
    code,
    players: [player],
    status: "lobby",
    currentRound: 0,
    scenarioOrder: arr,
    scores: { [player.id]: 0 },
    answers: {},
    revealed: false,
    roundStartTime: 0,
    roundRecords: [],
    readyVotes: new Set(),
    rematchVotes: new Set(),
    skipVotes: new Set(),
    lastHeartbeat: { [player.id]: Date.now() },
  };
  await persistRoom(room);
  return room;
}

export async function getRoom(code: string): Promise<Room | undefined> {
  return loadRoom(code);
}

export async function joinRoom(code: string, player: Player): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room || room.players.length >= 2 || room.status !== "lobby") return null;
  room.players.push(player);
  room.scores[player.id] = 0;
  room.lastHeartbeat[player.id] = Date.now();
  await persistRoom(room);
  return room;
}

export async function startGame(code: string): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room || room.players.length < 2 || room.status !== "lobby") return null;
  room.status = "playing";
  room.currentRound = 0;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  room.skipVotes = new Set();
  await persistRoom(room);
  return room;
}

export async function submitAnswer(
  code: string,
  playerId: string,
  answerIndex: number
): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room || room.revealed) return null;
  if (room.answers[playerId] !== undefined) return room;
  room.answers[playerId] = answerIndex;
  await persistRoom(room);
  return room;
}

export async function revealRound(
  code: string,
  correctIndex: number,
  scenarioId: number
): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room || room.revealed) return null;
  room.revealed = true;
  for (const player of room.players) {
    if (room.answers[player.id] === correctIndex) {
      room.scores[player.id] = (room.scores[player.id] ?? 0) + 1;
    }
  }
  room.roundRecords.push({
    roundIndex: room.currentRound,
    scenarioId,
    correctIndex,
    answers: { ...room.answers },
  });
  await persistRoom(room);
  return room;
}

export async function advanceRound(code: string, fromRound: number): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room || room.currentRound !== fromRound) return null;
  room.currentRound++;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  room.skipVotes = new Set();
  await clearVote(voteKey("skip", code));
  await persistRoom(room);
  return room;
}

export async function finishGame(code: string): Promise<Room | null> {
  const room = await loadRoom(code);
  if (!room) return null;
  room.status = "finished";
  await persistRoom(room);
  return room;
}

export async function requestSkip(
  code: string,
  playerId: string
): Promise<{ room: Room; allReady: boolean } | null> {
  const room = await loadRoom(code);
  if (!room || !room.revealed) return null;
  room.skipVotes.add(playerId);
  // Use atomic Redis voting to avoid race conditions across instances
  const r = getRedis();
  let allReady: boolean;
  if (r) {
    allReady = await atomicVote(voteKey("skip", code), playerId, room.players.length);
  } else {
    allReady = room.players.every((p) => room.skipVotes.has(p.id));
  }
  await persistRoom(room);
  return { room, allReady };
}

export async function requestRematch(
  code: string,
  playerId: string,
  scenarioCount: number
): Promise<{ room: Room; allReady: boolean } | null> {
  const room = await loadRoom(code);
  if (!room || room.status !== "finished") return null;
  room.rematchVotes.add(playerId);
  const r = getRedis();
  let allReady: boolean;
  if (r) {
    allReady = await atomicVote(voteKey("rematch", code), playerId, room.players.length);
  } else {
    allReady = room.players.every((p) => room.rematchVotes.has(p.id));
  }
  if (allReady) {
    room.status = "playing";
    room.currentRound = 0;
    room.answers = {};
    room.revealed = false;
    room.roundStartTime = Date.now();
    room.roundRecords = [];
    room.rematchVotes = new Set();
    room.skipVotes = new Set();
    room.readyVotes = new Set();
    for (const player of room.players) {
      room.scores[player.id] = 0;
    }
    const arr = Array.from({ length: scenarioCount }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    room.scenarioOrder = arr;
    await clearVote(voteKey("skip", code));
    await clearVote(voteKey("ready", code));
  }
  await persistRoom(room);
  return { room, allReady };
}

export async function requestReady(
  code: string,
  playerId: string
): Promise<{ room: Room; allReady: boolean } | null> {
  const room = await loadRoom(code);
  if (!room || room.players.length < 2) return null;
  room.readyVotes.add(playerId);
  const r = getRedis();
  let allReady: boolean;
  if (r) {
    allReady = await atomicVote(voteKey("ready", code), playerId, room.players.length);
  } else {
    allReady = room.players.every((p) => room.readyVotes.has(p.id));
  }
  if (allReady) {
    if (room.status === "lobby") {
      room.status = "playing";
      room.currentRound = 0;
      room.answers = {};
      room.revealed = false;
      room.skipVotes = new Set();
      await clearVote(voteKey("skip", code));
    }
    room.roundStartTime = Date.now();
    room.readyVotes = new Set();
  }
  await persistRoom(room);
  return { room, allReady };
}

export async function updateHeartbeat(
  code: string,
  playerId: string
): Promise<{ opponentLastBeat: number | null } | null> {
  const room = await loadRoom(code);
  if (!room) return null;
  room.lastHeartbeat[playerId] = Date.now();
  await persistRoom(room);
  const opponent = room.players.find((p) => p.id !== playerId);
  return {
    opponentLastBeat: opponent ? (room.lastHeartbeat[opponent.id] ?? null) : null,
  };
}
