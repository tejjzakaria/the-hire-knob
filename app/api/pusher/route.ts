import { NextRequest, NextResponse } from "next/server";
import pusherServer from "@/src/lib/pusherServer";
import {
  generateCode,
  createRoom,
  getRoom,
  joinRoom,
  startGame,
  type Room,
} from "@/src/lib/gameStore";
import { scenarios } from "@/src/data/scenarios";

type ScenarioForClient = {
  id: number;
  candidateName: string;
  candidateInitials: string;
  role: string;
  aiDecision: "hired" | "rejected";
  profileFields: Record<string, string>;
  aiRationale: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  options: { label: string }[];
};

function roomScenario(room: Room) {
  return scenarios[room.scenarioOrder[room.currentRound]];
}

function toClientScenario(
  scenario: (typeof scenarios)[number]
): ScenarioForClient {
  return {
    id: scenario.id,
    candidateName: scenario.candidateName,
    candidateInitials: scenario.candidateInitials,
    role: scenario.role,
    aiDecision: scenario.aiDecision,
    profileFields: scenario.profileFields,
    aiRationale: scenario.aiRationale,
    difficulty: scenario.difficulty,
    explanation: scenario.explanation,
    options: scenario.options.map((o) => ({ label: o.label })),
  };
}

function sanitize(room: Room) {
  return {
    code: room.code,
    status: room.status,
    currentRound: room.currentRound,
    scores: room.scores,
    players: room.players,
    revealed: room.revealed,
    roundStartTime: room.roundStartTime,
    answeredPlayerIds: Object.keys(room.answers),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body as { action: string };

  switch (action) {
    case "create-room": {
      const { playerId, playerName } = body as {
        playerId: string;
        playerName: string;
      };
      const code = generateCode();
      const room = createRoom(
        code,
        { id: playerId, name: playerName, slot: 1 },
        scenarios.length
      );
      return NextResponse.json({ roomCode: code, slot: 1, room: sanitize(room) });
    }

    case "join-room": {
      const { roomCode, playerId, playerName } = body as {
        roomCode: string;
        playerId: string;
        playerName: string;
      };
      const room = joinRoom(roomCode, { id: playerId, name: playerName, slot: 2 });
      if (!room) {
        return NextResponse.json(
          { error: "Room not found or already full" },
          { status: 404 }
        );
      }
      await pusherServer.trigger(`game-${roomCode}`, "player-joined", {
        player: { id: playerId, name: playerName, slot: 2 },
      });
      return NextResponse.json({ slot: 2, room: sanitize(room) });
    }

    case "get-room": {
      const { roomCode } = body as { roomCode: string };
      const room = getRoom(roomCode);
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      const result: Record<string, unknown> = { room: sanitize(room) };
      if (room.status === "playing") {
        result.scenario = toClientScenario(roomScenario(room));
        result.round = room.currentRound;
        result.totalRounds = scenarios.length;
        result.roundStartTime = room.roundStartTime;
      }
      return NextResponse.json(result);
    }

    case "start-game": {
      const { roomCode } = body as { roomCode: string };
      const room = startGame(roomCode);
      if (!room) {
        return NextResponse.json({ error: "Cannot start game" }, { status: 400 });
      }
      await pusherServer.trigger(`game-${roomCode}`, "round-start", {
        round: 0,
        totalRounds: scenarios.length,
        scenario: toClientScenario(roomScenario(room)),
        roundStartTime: room.roundStartTime,
      });
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
