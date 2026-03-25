import { NextRequest, NextResponse } from "next/server";
import pusherServer from "@/src/lib/pusherServer";
import {
  generateCode,
  createRoom,
  getRoom,
  joinRoom,
  startGame,
  submitAnswer,
  revealRound,
  advanceRound,
} from "@/src/lib/gameStore";
import { saveResult } from "@/src/lib/results";
import { scenarios } from "@/src/data/scenarios";

export async function POST(request: NextRequest) {
  // --------- handle the request -----------
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === "create-room") {
      const { playerId, playerName } = body;
      const code = generateCode();
      const room = createRoom(code, { id: playerId, name: playerName, slot: 1 }, scenarios.length);
      return NextResponse.json({
        roomCode: code,
        slot: 1,
        room: {
          code: room.code,
          status: room.status,
          currentRound: room.currentRound,
          scores: room.scores,
          players: room.players,
          revealed: room.revealed,
          roundStartTime: room.roundStartTime,
          answeredPlayerIds: Object.keys(room.answers),
        },
      });
    }

    if (action === "join-room") {
      const { roomCode, playerId, playerName } = body;
      const room = joinRoom(roomCode, { id: playerId, name: playerName, slot: 2 });
      if (!room) {
        return NextResponse.json({ error: "Room not found or already full" }, { status: 404 });
      }
      await pusherServer.trigger(`game-${roomCode}`, "player-joined", {
        player: { id: playerId, name: playerName, slot: 2 },
      });
      return NextResponse.json({
        slot: 2,
        room: {
          code: room.code,
          status: room.status,
          currentRound: room.currentRound,
          scores: room.scores,
          players: room.players,
          revealed: room.revealed,
          roundStartTime: room.roundStartTime,
          answeredPlayerIds: Object.keys(room.answers),
        },
      });
    }

    if (action === "get-room") {
      const { roomCode } = body;
      const room = getRoom(roomCode);
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      // --------- build room response -----------
      const result: Record<string, unknown> = {
        room: {
          code: room.code,
          status: room.status,
          currentRound: room.currentRound,
          scores: room.scores,
          players: room.players,
          revealed: room.revealed,
          roundStartTime: room.roundStartTime,
          answeredPlayerIds: Object.keys(room.answers),
        },
      };
      if (room.status === "playing") {
        // --------- get scenario for this round -----------
        const sc = scenarios[room.scenarioOrder[room.currentRound]];
        result.scenario = {
          id: sc.id,
          candidateName: sc.candidateName,
          candidateInitials: sc.candidateInitials,
          role: sc.role,
          aiDecision: sc.aiDecision,
          profileFields: sc.profileFields,
          aiRationale: sc.aiRationale,
          difficulty: sc.difficulty,
          explanation: sc.explanation,
          options: sc.options.map((o: { label: string; isCorrect: boolean }) => ({ label: o.label })),
        };
        result.round = room.currentRound;
        result.totalRounds = scenarios.length;
        result.roundStartTime = room.roundStartTime;
      }
      return NextResponse.json(result);
    }

    if (action === "start-game") {
      const { roomCode } = body;
      const room = startGame(roomCode);
      if (!room) {
        return NextResponse.json({ error: "Cannot start game" }, { status: 400 });
      }
      // --------- send scenario to clients -----------
      const sc = scenarios[room.scenarioOrder[room.currentRound]];
      await pusherServer.trigger(`game-${roomCode}`, "round-start", {
        round: 0,
        totalRounds: scenarios.length,
        scenario: {
          id: sc.id,
          candidateName: sc.candidateName,
          candidateInitials: sc.candidateInitials,
          role: sc.role,
          aiDecision: sc.aiDecision,
          profileFields: sc.profileFields,
          aiRationale: sc.aiRationale,
          difficulty: sc.difficulty,
          explanation: sc.explanation,
          options: sc.options.map((o: { label: string; isCorrect: boolean }) => ({ label: o.label })),
        },
        roundStartTime: room.roundStartTime,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "select-answer") {
      const { roomCode, playerId, answerIndex } = body;
      const room = submitAnswer(roomCode, playerId, answerIndex);
      if (!room) {
        return NextResponse.json({ error: "Invalid state" }, { status: 400 });
      }
      await pusherServer.trigger(`game-${roomCode}`, "answer-received", { playerId });
      // --------- check if everyone answered -----------
      const allAnswered = room.players.every((p) => room.answers[p.id] !== undefined);
      if (allAnswered) {
        // --------- do the reveal -----------
        const scenario = scenarios[room.scenarioOrder[room.currentRound]];
        const ci = scenario.options.findIndex((o: { isCorrect: boolean }) => o.isCorrect);
        const updated = revealRound(roomCode, ci, scenario.id);
        if (updated) {
          await pusherServer.trigger(`game-${roomCode}`, "round-reveal", {
            answers: updated.answers,
            correctIndex: ci,
            scores: updated.scores,
            players: updated.players,
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "timer-expired") {
      const { roomCode } = body;
      const room = getRoom(roomCode);
      if (!room || room.revealed) {
        return NextResponse.json({ ok: true });
      }
      // --------- do the reveal -----------
      const scenario = scenarios[room.scenarioOrder[room.currentRound]];
      const ci = scenario.options.findIndex((o: { isCorrect: boolean }) => o.isCorrect);
      const updated = revealRound(roomCode, ci, scenario.id);
      if (updated) {
        await pusherServer.trigger(`game-${roomCode}`, "round-reveal", {
          answers: updated.answers,
          correctIndex: ci,
          scores: updated.scores,
          players: updated.players,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "next-round") {
      const { roomCode, fromRound } = body;
      const room = advanceRound(roomCode, fromRound);
      if (!room) {
        return NextResponse.json({ ok: true });
      }
      if (room.currentRound >= scenarios.length) {
        // --------- game over -----------
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
        // --------- next round -----------
        const sc = scenarios[room.scenarioOrder[room.currentRound]];
        await pusherServer.trigger(`game-${roomCode}`, "round-start", {
          round: room.currentRound,
          totalRounds: scenarios.length,
          scenario: {
            id: sc.id,
            candidateName: sc.candidateName,
            candidateInitials: sc.candidateInitials,
            role: sc.role,
            aiDecision: sc.aiDecision,
            profileFields: sc.profileFields,
            aiRationale: sc.aiRationale,
            difficulty: sc.difficulty,
            explanation: sc.explanation,
            options: sc.options.map((o: { label: string; isCorrect: boolean }) => ({ label: o.label })),
          },
          roundStartTime: room.roundStartTime,
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    // --------- something went wrong -----------
    return NextResponse.json({ error: "something went wrong" }, { status: 500 });
  }
}
