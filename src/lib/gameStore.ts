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
  // ------------ shuffled indices into the scenarios array, seeded by room code ------------
  scenarioOrder: number[];
  scores: Record<string, number>;
  answers: Record<string, number | null>;
  revealed: boolean;
  // ------------ epoch-ms when the current round started (for client timer sync) ------------
  roundStartTime: number;
  // ------------ accumulated per-round results for the final record ------------
  roundRecords: RoundRecord[];
}

const rooms = new Map<string, Room>();

// ------------ deterministic fisher-yates shuffle using an lcg seeded from the room code. both players will always see the same scenario order for a given room ------------
function seededShuffle(indices: number[], seed: string): number[] {
  const arr = [...indices];
  // ------------ mix seed characters into a 32-bit integer ------------
  let state = 0;
  for (let i = 0; i < seed.length; i++) {
    state = (Math.imul(state, 31) + seed.charCodeAt(i)) | 0;
  }
  // ------------ fisher-yates with lcg steps ------------
  for (let i = arr.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    const j = Math.abs(state) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateCode(): string {
  let code: string;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

export function createRoom(
  code: string,
  player: Player,
  scenarioCount: number
): Room {
  const room: Room = {
    code,
    players: [player],
    status: "lobby",
    currentRound: 0,
    scenarioOrder: seededShuffle(
      Array.from({ length: scenarioCount }, (_, i) => i),
      code
    ),
    scores: { [player.id]: 0 },
    answers: {},
    revealed: false,
    roundStartTime: 0,
    roundRecords: [],
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function joinRoom(code: string, player: Player): Room | null {
  const room = rooms.get(code);
  if (!room || room.players.length >= 2 || room.status !== "lobby") return null;
  room.players.push(player);
  room.scores[player.id] = 0;
  return room;
}

export function startGame(code: string): Room | null {
  const room = rooms.get(code);
  if (!room || room.players.length < 2) return null;
  room.status = "playing";
  room.currentRound = 0;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  return room;
}

export function submitAnswer(
  code: string,
  playerId: string,
  answerIndex: number
): Room | null {
  const room = rooms.get(code);
  if (!room || room.revealed) return null;
  if (room.answers[playerId] !== undefined) return room; // ------------ idempotent ------------
  room.answers[playerId] = answerIndex;
  return room;
}

export function revealRound(
  code: string,
  correctIndex: number,
  scenarioId: number
): Room | null {
  const room = rooms.get(code);
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
  return room;
}

export function advanceRound(code: string, fromRound: number): Room | null {
  const room = rooms.get(code);
  if (!room || room.currentRound !== fromRound) return null; // ------------ idempotent ------------
  room.currentRound++;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  return room;
}
