import { NextRequest, NextResponse } from "next/server";
import pusherServer from "@/src/lib/pusherServer";
import { saveResult } from "@/src/lib/results";
import {
  generateCode,
  createRoom,
  getRoom,
  joinRoom,
  startGame,
  submitAnswer,
  revealRound,
  advanceRound,
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

function correctIndexFor(scenario: (typeof scenarios)[number]): number {
  return scenario.options.findIndex((o) => o.isCorrect);
}

async function triggerReveal(roomCode: string, room: Room) {
  const scenario = roomScenario(room);
  const ci = correctIndexFor(scenario);
  const updated = revealRound(roomCode, ci, scenario.id);
  if (!updated) return;
  await pusherServer.trigger(`game-${roomCode}`, "round-reveal", {
    answers: updated.answers,
    correctIndex: ci,
    scores: updated.scores,
    players: updated.players,
  });
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

    case "select-answer": {
      const { roomCode, playerId, answerIndex } = body as {
        roomCode: string;
        playerId: string;
        answerIndex: number;
      };
      const room = submitAnswer(roomCode, playerId, answerIndex);
      if (!room) {
        return NextResponse.json({ error: "Invalid state" }, { status: 400 });
      }
      await pusherServer.trigger(`game-${roomCode}`, "answer-received", {
        playerId,
      });
      const allAnswered = room.players.every(
        (p) => room.answers[p.id] !== undefined
      );
      if (allAnswered) {
        await triggerReveal(roomCode, room);
      }
      return NextResponse.json({ ok: true });
    }

    case "timer-expired": {
      const { roomCode } = body as { roomCode: string };
      const room = getRoom(roomCode);
      if (!room || room.revealed) {
        return NextResponse.json({ ok: true });
      }
      await triggerReveal(roomCode, room);
      return NextResponse.json({ ok: true });
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

    case "next-round": {
      const { roomCode, fromRound } = body as {
        roomCode: string;
        fromRound: number;
      };
      const room = advanceRound(roomCode, fromRound);
      if (!room) {
        return NextResponse.json({ ok: true });
      }
      if (room.currentRound >= scenarios.length) {
        const sortedScores = Object.entries(room.scores).sort(([, a], [, b]) => b - a);
        const winner =
          sortedScores.length >= 2 && sortedScores[0][1] > sortedScores[1][1]
            ? sortedScores[0][0]
            : null;
        await saveResult({
          id: crypto.randomUUID(),
          roomCode,
          playedAt: new Date().toISOString(),
          players: room.players,
          scores: room.scores,
          winner,
          rounds: room.roundRecords,
        });

        await pusherServer.trigger(`game-${roomCode}`, "game-over", {
          scores: room.scores,
          players: room.players,
        });
      } else {
        await pusherServer.trigger(`game-${roomCode}`, "round-start", {
          round: room.currentRound,
          totalRounds: scenarios.length,
          scenario: toClientScenario(roomScenario(room)),
          roundStartTime: room.roundStartTime,
        });
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
