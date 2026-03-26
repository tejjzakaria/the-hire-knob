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
  rematchVotes: Set<string>;
  skipVotes: Set<string>;
  lastHeartbeat: Record<string, number>;
}

const rooms = new Map<string, Room>();

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
  // --------- shuffle the scenarios -----------
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
    rematchVotes: new Set(),
    skipVotes: new Set(),
    lastHeartbeat: { [player.id]: Date.now() },
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
  room.lastHeartbeat[player.id] = Date.now();
  return room;
}

export function startGame(code: string): Room | null {
  const room = rooms.get(code);
  if (!room || room.players.length < 2 || room.status !== "lobby") return null;
  room.status = "playing";
  room.currentRound = 0;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  room.skipVotes = new Set();
  return room;
}

export function submitAnswer(
  code: string,
  playerId: string,
  answerIndex: number
): Room | null {
  const room = rooms.get(code);
  if (!room || room.revealed) return null;
  if (room.answers[playerId] !== undefined) return room;
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
  if (!room || room.currentRound !== fromRound) return null;
  room.currentRound++;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  room.skipVotes = new Set();
  return room;
}

export function requestSkip(
  code: string,
  playerId: string
): { room: Room; allReady: boolean } | null {
  const room = rooms.get(code);
  if (!room || !room.revealed) return null;
  room.skipVotes.add(playerId);
  const allReady = room.players.every((p) => room.skipVotes.has(p.id));
  return { room, allReady };
}

export function requestRematch(
  code: string,
  playerId: string,
  scenarioCount: number
): { room: Room; allReady: boolean } | null {
  const room = rooms.get(code);
  if (!room || room.status !== "finished") return null;
  room.rematchVotes.add(playerId);
  const allReady = room.players.every((p) => room.rematchVotes.has(p.id));
  if (allReady) {
    room.status = "playing";
    room.currentRound = 0;
    room.answers = {};
    room.revealed = false;
    room.roundStartTime = Date.now();
    room.roundRecords = [];
    room.rematchVotes = new Set();
    room.skipVotes = new Set();
    for (const player of room.players) {
      room.scores[player.id] = 0;
    }
    const arr = Array.from({ length: scenarioCount }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    room.scenarioOrder = arr;
  }
  return { room, allReady };
}

export function updateHeartbeat(
  code: string,
  playerId: string
): { opponentLastBeat: number | null } | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.lastHeartbeat[playerId] = Date.now();
  const opponent = room.players.find((p) => p.id !== playerId);
  return {
    opponentLastBeat: opponent ? (room.lastHeartbeat[opponent.id] ?? null) : null,
  };
}
