export interface Player {
  id: string;
  name: string;
  slot: 1 | 2;
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
  const room: Room = {
    code,
    players: [player],
    status: "lobby",
    currentRound: 0,
    scenarioOrder: Array.from({ length: scenarioCount }, (_, i) => i),
    scores: { [player.id]: 0 },
    answers: {},
    revealed: false,
    roundStartTime: 0,
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
  if (room.answers[playerId] !== undefined) return room;
  room.answers[playerId] = answerIndex;
  return room;
}

export function revealRound(
  code: string,
  correctIndex: number
): Room | null {
  const room = rooms.get(code);
  if (!room || room.revealed) return null;
  room.revealed = true;
  for (const player of room.players) {
    if (room.answers[player.id] === correctIndex) {
      room.scores[player.id] = (room.scores[player.id] ?? 0) + 1;
    }
  }
  return room;
}

export function advanceRound(code: string, fromRound: number): Room | null {
  const room = rooms.get(code);
  if (!room || room.currentRound !== fromRound) return null;
  room.currentRound++;
  room.answers = {};
  room.revealed = false;
  room.roundStartTime = Date.now();
  return room;
}
