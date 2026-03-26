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
  requestSkip,
  requestRematch,
  requestReady,
  updateHeartbeat,
  finishGame,
  createGroupRoom,
  groupStartGame,
  groupSubmitAnswer,
  groupRevealRound,
  groupAdvanceRound,
} from "@/src/lib/gameStore";
import { saveResult } from "@/src/lib/results";
import { scenarios } from "@/src/data/scenarios";

const TOTAL_ROUNDS = 5;

function buildScenarioPayload(sc: (typeof scenarios)[number]) {
  return {
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === "create-room") {
      const { playerId, playerName } = body;
      const code = generateCode();
      const room = await createRoom(code, { id: playerId, name: playerName, slot: 1 }, scenarios.length);
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
      // Check room exists first to determine slot
      const existing = await getRoom(roomCode);
      if (!existing) {
        return NextResponse.json({ error: "Room not found or already full" }, { status: 404 });
      }
      const slot = existing.players.length + 1;
      const room = await joinRoom(roomCode, { id: playerId, name: playerName, slot });
      if (!room) {
        return NextResponse.json({ error: "Room not found or already full" }, { status: 404 });
      }
      await pusherServer.trigger(`game-${roomCode}`, "player-joined", {
        player: { id: playerId, name: playerName, slot },
        playerCount: room.players.length,
      });
      return NextResponse.json({
        slot,
        room: {
          code: room.code,
          status: room.status,
          mode: room.mode,
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
      const room = await getRoom(roomCode);
      if (!room) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
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
        const sc = scenarios[room.scenarioOrder[room.currentRound]];
        result.scenario = buildScenarioPayload(sc);
        result.round = room.currentRound;
        result.totalRounds = TOTAL_ROUNDS;
        result.roundStartTime = room.roundStartTime;
      }
      return NextResponse.json(result);
    }

    if (action === "start-game") {
      const { roomCode } = body;
      const room = await startGame(roomCode);
      if (!room) {
        return NextResponse.json({ error: "Cannot start game" }, { status: 400 });
      }
      const sc = scenarios[room.scenarioOrder[room.currentRound]];
      await pusherServer.trigger(`game-${roomCode}`, "round-start", {
        round: 0,
        totalRounds: TOTAL_ROUNDS,
        scenario: buildScenarioPayload(sc),
        roundStartTime: room.roundStartTime,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "select-answer") {
      const { roomCode, playerId, answerIndex } = body;
      const room = await submitAnswer(roomCode, playerId, answerIndex);
      if (!room) {
        const exists = await getRoom(roomCode);
        console.error(`[select-answer] Room ${roomCode} not found or already revealed. Room exists: ${!!exists}`);
        return NextResponse.json({ error: "Room not found or round already revealed. The game may have expired." }, { status: 400 });
      }
      await pusherServer.trigger(`game-${roomCode}`, "answer-received", { playerId });
      const allAnswered = room.players.every((p) => room.answers[p.id] !== undefined);
      if (allAnswered) {
        const scenario = scenarios[room.scenarioOrder[room.currentRound]];
        const ci = scenario.options.findIndex((o: { isCorrect: boolean }) => o.isCorrect);
        const updated = await revealRound(roomCode, ci, scenario.id);
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
      const room = await getRoom(roomCode);
      if (!room || room.revealed) {
        return NextResponse.json({ ok: true });
      }
      const scenario = scenarios[room.scenarioOrder[room.currentRound]];
      const ci = scenario.options.findIndex((o: { isCorrect: boolean }) => o.isCorrect);
      const updated = await revealRound(roomCode, ci, scenario.id);
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
      const room = await advanceRound(roomCode, fromRound);
      if (!room) {
        return NextResponse.json({ ok: true });
      }
      if (room.currentRound >= TOTAL_ROUNDS) {
        await finishGame(roomCode);
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
        const sc = scenarios[room.scenarioOrder[room.currentRound]];
        await pusherServer.trigger(`game-${roomCode}`, "round-start", {
          round: room.currentRound,
          totalRounds: TOTAL_ROUNDS,
          scenario: buildScenarioPayload(sc),
          roundStartTime: room.roundStartTime,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "request-ready") {
      const { roomCode, playerId } = body;
      const result = await requestReady(roomCode, playerId);
      if (!result) {
        return NextResponse.json({ ok: true });
      }
      if (result.allReady) {
        const sc = scenarios[result.room.scenarioOrder[result.room.currentRound]];
        await pusherServer.trigger(`game-${roomCode}`, "round-start", {
          round: result.room.currentRound,
          totalRounds: TOTAL_ROUNDS,
          scenario: buildScenarioPayload(sc),
          roundStartTime: result.room.roundStartTime,
        });
      } else {
        await pusherServer.trigger(`game-${roomCode}`, "ready-requested", { playerId });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "request-skip") {
      const { roomCode, playerId } = body;
      const result = await requestSkip(roomCode, playerId);
      if (!result) {
        return NextResponse.json({ ok: true });
      }
      if (result.allReady) {
        const room = await advanceRound(roomCode, result.room.currentRound);
        if (!room) {
          return NextResponse.json({ ok: true });
        }
        if (room.currentRound >= TOTAL_ROUNDS) {
          await finishGame(roomCode);
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
          const sc = scenarios[room.scenarioOrder[room.currentRound]];
          await pusherServer.trigger(`game-${roomCode}`, "round-start", {
            round: room.currentRound,
            totalRounds: TOTAL_ROUNDS,
            scenario: buildScenarioPayload(sc),
            roundStartTime: room.roundStartTime,
          });
        }
      } else {
        await pusherServer.trigger(`game-${roomCode}`, "skip-requested", { playerId });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "request-rematch") {
      const { roomCode, playerId } = body;
      const result = await requestRematch(roomCode, playerId, scenarios.length);
      if (!result) {
        return NextResponse.json({ error: "Cannot rematch" }, { status: 400 });
      }
      if (result.allReady) {
        await pusherServer.trigger(`game-${roomCode}`, "rematch-start", {
          roundStartTime: result.room.roundStartTime,
          scores: result.room.scores,
          players: result.room.players,
        });
      } else {
        await pusherServer.trigger(`game-${roomCode}`, "rematch-requested", { playerId });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "heartbeat") {
      const { roomCode, playerId } = body;
      const result = await updateHeartbeat(roomCode, playerId);
      if (!result) {
        return NextResponse.json({ error: "Room not found" }, { status: 404 });
      }
      return NextResponse.json({ opponentLastBeat: result.opponentLastBeat });
    }

    // --------- group mode actions -----------

    if (action === "create-group-room") {
      const { playerId, playerName, totalRounds } = body;
      const code = generateCode();
      const rounds = Math.min(Math.max(Number(totalRounds) || 5, 1), 15);
      const room = await createGroupRoom(code, { id: playerId, name: playerName, slot: 1 }, scenarios.length, rounds);
      return NextResponse.json({
        roomCode: code,
        room: {
          code: room.code,
          status: room.status,
          mode: room.mode,
          hostId: room.hostId,
          totalRounds: room.totalRounds,
          players: room.players,
          scores: room.scores,
        },
      });
    }

    if (action === "get-group-room") {
      const { roomCode } = body;
      const room = await getRoom(roomCode);
      if (!room || room.mode !== "group") {
        return NextResponse.json({ error: "Group room not found" }, { status: 404 });
      }
      const result: Record<string, unknown> = {
        room: {
          code: room.code,
          status: room.status,
          mode: room.mode,
          hostId: room.hostId,
          totalRounds: room.totalRounds,
          currentRound: room.currentRound,
          scores: room.scores,
          players: room.players,
          revealed: room.revealed,
          roundStartTime: room.roundStartTime,
          answerCount: Object.keys(room.answers).length,
        },
      };
      if (room.status === "playing") {
        const sc = scenarios[room.scenarioOrder[room.currentRound]];
        result.scenario = buildScenarioPayload(sc);
        result.round = room.currentRound;
        result.totalRounds = room.totalRounds;
        result.roundStartTime = room.roundStartTime;
      }
      return NextResponse.json(result);
    }

    if (action === "group-start-game") {
      const { roomCode, playerId } = body;
      const room = await groupStartGame(roomCode, playerId);
      if (!room) {
        return NextResponse.json({ error: "Cannot start group game" }, { status: 400 });
      }
      const sc = scenarios[room.scenarioOrder[0]];
      await pusherServer.trigger(`game-${roomCode}`, "group-round-start", {
        round: 0,
        totalRounds: room.totalRounds,
        scenario: buildScenarioPayload(sc),
        roundStartTime: room.roundStartTime,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "group-select-answer") {
      const { roomCode, playerId, answerIndex } = body;
      const result = await groupSubmitAnswer(roomCode, playerId, answerIndex);
      if (!result) {
        return NextResponse.json({ error: "Cannot submit answer" }, { status: 400 });
      }
      // Notify channel with updated answer count
      await pusherServer.trigger(`game-${roomCode}`, "group-answer-count", {
        answerCount: result.answerCount,
        totalPlayers: result.totalPlayers,
      });
      // Auto-reveal when all players have answered
      if (result.answerCount >= result.totalPlayers) {
        const scenario = scenarios[result.room.scenarioOrder[result.room.currentRound]];
        const ci = scenario.options.findIndex((o: { isCorrect: boolean }) => o.isCorrect);
        const updated = await groupRevealRound(roomCode, ci, scenario.id);
        if (updated) {
          const distribution: Record<number, number> = {};
          for (const player of updated.players) {
            if (player.id === updated.hostId) continue;
            const ans = updated.answers[player.id];
            if (ans !== undefined && ans !== null) {
              distribution[ans] = (distribution[ans] ?? 0) + 1;
            }
          }
          await pusherServer.trigger(`game-${roomCode}`, "group-round-reveal", {
            correctIndex: ci,
            answers: updated.answers,
            distribution,
            scores: updated.scores,
            totalPlayers: updated.players.length - 1,
          });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "group-timer-expired") {
      const { roomCode } = body;
      const room = await getRoom(roomCode);
      if (!room || room.mode !== "group" || room.revealed) {
        return NextResponse.json({ ok: true });
      }
      const scenario = scenarios[room.scenarioOrder[room.currentRound]];
      const ci = scenario.options.findIndex((o: { isCorrect: boolean }) => o.isCorrect);
      const updated = await groupRevealRound(roomCode, ci, scenario.id);
      if (updated) {
        const distribution: Record<number, number> = {};
        for (const player of updated.players) {
          if (player.id === updated.hostId) continue;
          const ans = updated.answers[player.id];
          if (ans !== undefined && ans !== null) {
            distribution[ans] = (distribution[ans] ?? 0) + 1;
          }
        }
        await pusherServer.trigger(`game-${roomCode}`, "group-round-reveal", {
          correctIndex: ci,
          answers: updated.answers,
          distribution,
          scores: updated.scores,
          totalPlayers: updated.players.length - 1,
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "group-next-round") {
      const { roomCode, playerId } = body;
      const room = await groupAdvanceRound(roomCode, playerId);
      if (!room) {
        return NextResponse.json({ ok: true });
      }
      if (room.currentRound >= room.totalRounds) {
        await finishGame(roomCode);
        // Build rankings
        const rankings = room.players
          .filter((p) => p.id !== room.hostId)
          .map((p) => ({ id: p.id, name: p.name, score: room.scores[p.id] ?? 0 }))
          .sort((a, b) => b.score - a.score);
        await saveResult({
          id: crypto.randomUUID(),
          roomCode,
          playedAt: new Date().toISOString(),
          players: room.players,
          scores: room.scores,
          winner: rankings.length > 0 ? rankings[0].id : null,
          rounds: room.roundRecords,
        });
        await pusherServer.trigger(`game-${roomCode}`, "group-game-over", { rankings });
      } else {
        const sc = scenarios[room.scenarioOrder[room.currentRound]];
        await pusherServer.trigger(`game-${roomCode}`, "group-round-start", {
          round: room.currentRound,
          totalRounds: room.totalRounds,
          scenario: buildScenarioPayload(sc),
          roundStartTime: room.roundStartTime,
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error("[api/pusher] Error:", e);
    return NextResponse.json({ error: "something went wrong" }, { status: 500 });
  }
}
