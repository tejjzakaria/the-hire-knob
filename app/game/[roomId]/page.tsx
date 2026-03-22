"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPusherClient } from "@/src/lib/pusher";
import type { Channel } from "pusher-js";

interface OptionForClient {
  label: string;
}

interface ScenarioForClient {
  id: number;
  candidateName: string;
  candidateInitials: string;
  role: string;
  aiDecision: "hired" | "rejected";
  profileFields: Record<string, string>;
  aiRationale: string;
  difficulty: "easy" | "medium" | "hard";
  explanation: string;
  options: OptionForClient[];
}

interface PlayerInfo {
  id: string;
  name: string;
  slot: 1 | 2;
}

interface RevealPayload {
  answers: Record<string, number | null>;
  correctIndex: number;
  scores: Record<string, number>;
  players: PlayerInfo[];
}

interface GameOverPayload {
  scores: Record<string, number>;
  players: PlayerInfo[];
}

type GamePhase =
  | "loading"
  | "waiting"
  | "instructions"
  | "playing"
  | "answered"
  | "revealed"
  | "finished";

const ROUND_SECONDS = 60;
const NEXT_ROUND_SECONDS = 5;

function calculateTimerFromStart(roundStartTime: number): number {
  const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
  return Math.max(0, ROUND_SECONDS - elapsed);
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  const meRef = useRef<{ id: string; name: string; slot: number } | null>(null);

  const [phase, setPhase] = useState<GamePhase>("loading");
  const [scenario, setScenario] = useState<ScenarioForClient | null>(null);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [opponentAnswered, setOpponentAnswered] = useState(false);
  const [revealData, setRevealData] = useState<RevealPayload | null>(null);
  const [finalData, setFinalData] = useState<GameOverPayload | null>(null);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [guestReady, setGuestReady] = useState(false);
  const [error, setError] = useState("");

  const [timer, setTimer] = useState(ROUND_SECONDS);
  const [nextRoundTimer, setNextRoundTimer] = useState(NEXT_ROUND_SECONDS);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerExpiredRef = useRef(false);
  const nextRoundIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRoundTriggeredRef = useRef(false);
  const currentRoundRef = useRef(0);
  const scenarioRef = useRef<ScenarioForClient | null>(null);
  const selectedAnswerRef = useRef<number | null>(null);
  const startedGameRef = useRef(false);
  const channelRef = useRef<Channel | null>(null);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback((initialSeconds = ROUND_SECONDS) => {
    stopTimer();
    timerExpiredRef.current = false;
    setTimer(initialSeconds);
    timerIntervalRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          stopTimer();
          if (!timerExpiredRef.current) {
            timerExpiredRef.current = true;
            fetch("/api/pusher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "timer-expired", roomCode: roomId }),
            }).catch(() => {});
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer, roomId]);

  const stopNextRoundTimer = useCallback(() => {
    if (nextRoundIntervalRef.current) {
      clearInterval(nextRoundIntervalRef.current);
      nextRoundIntervalRef.current = null;
    }
  }, []);

  const startNextRoundTimer = useCallback(
    (fromRound: number) => {
      stopNextRoundTimer();
      nextRoundTriggeredRef.current = false;
      setNextRoundTimer(NEXT_ROUND_SECONDS);
      nextRoundIntervalRef.current = setInterval(() => {
        setNextRoundTimer((t) => {
          if (t <= 1) {
            stopNextRoundTimer();
            if (!nextRoundTriggeredRef.current) {
              nextRoundTriggeredRef.current = true;
              fetch("/api/pusher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "next-round",
                  roomCode: roomId,
                  fromRound,
                }),
              }).catch(() => {});
            }
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    [stopNextRoundTimer, roomId]
  );

  useEffect(() => {
    const playerId = localStorage.getItem("hire-knob-player-id");
    const playerName = localStorage.getItem("hire-knob-player-name");
    const playerSlot = localStorage.getItem("hire-knob-player-slot");
    if (!playerId || !playerName) {
      router.replace("/");
      return;
    }
    meRef.current = { id: playerId, name: playerName, slot: Number(playerSlot) || 1 };

    const pusher = getPusherClient();
    const ch = pusher.subscribe(`game-${roomId}`);
    channelRef.current = ch;

    ch.bind("player-joined", (data: { player: PlayerInfo }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.player.id)) return prev;
        return [...prev, data.player];
      });
      setGuestReady(true);
    });

    ch.bind("round-start", (data: { round: number; totalRounds: number; scenario: ScenarioForClient; roundStartTime: number }) => {
      setRound(data.round);
      currentRoundRef.current = data.round;
      setTotalRounds(data.totalRounds);
      setScenario(data.scenario);
      scenarioRef.current = data.scenario;
      setSelectedAnswer(null);
      selectedAnswerRef.current = null;
      setOpponentAnswered(false);
      setRevealData(null);
      setPhase("playing");
      startTimer(calculateTimerFromStart(data.roundStartTime));
    });

    ch.bind("answer-received", (data: { playerId: string }) => {
      if (meRef.current && data.playerId !== meRef.current.id) {
        setOpponentAnswered(true);
      }
    });

    ch.bind("round-reveal", (data: RevealPayload) => {
      stopTimer();
      setRevealData(data);
      setScores(data.scores);
      setPlayers(data.players);
      setPhase("revealed");
      startNextRoundTimer(currentRoundRef.current);
    });

    ch.bind("game-over", (data: GameOverPayload) => {
      stopTimer();
      stopNextRoundTimer();
      setFinalData(data);
      setScores(data.scores);
      setPlayers(data.players);
      setPhase("finished");
    });

    fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-room", roomCode: roomId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setPhase("loading"); return; }
        const room = data.room;
        setPlayers(room.players ?? []);
        setScores(room.scores ?? {});
        if (room.status === "lobby") {
          const me = meRef.current;
          if (me && room.players?.find((p: PlayerInfo) => p.id === me.id)) {
            if (room.players.length >= 2) setGuestReady(true);
          }
          setPhase("waiting");
          if (room.players?.length === 2 && !startedGameRef.current) {
            const isHost = meRef.current?.slot === 1;
            if (isHost) {
              startedGameRef.current = true;
              fetch("/api/pusher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "start-game", roomCode: roomId }),
              }).catch(() => {});
            }
          }
        } else if (room.status === "playing" && data.scenario) {
          setRound(data.round ?? 0);
          currentRoundRef.current = data.round ?? 0;
          setTotalRounds(data.totalRounds ?? 5);
          setScenario(data.scenario);
          scenarioRef.current = data.scenario;
          setPhase("playing");
          startTimer(calculateTimerFromStart(data.roundStartTime ?? room.roundStartTime));
        }
      })
      .catch(() => setError("Connection error"));

    return () => {
      pusher.unsubscribe(`game-${roomId}`);
      stopTimer();
      stopNextRoundTimer();
    };
  }, [roomId, router, startTimer, stopTimer, startNextRoundTimer, stopNextRoundTimer]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-rose-400">{error}</p>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (phase === "waiting") {
    const roomCode = roomId;
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-zinc-400 mb-2">Room code</p>
          <p className="text-4xl font-black text-lime-400 tracking-widest">{roomCode}</p>
          <p className="mt-4 text-zinc-500">
            {guestReady ? "Both players ready — starting…" : "Waiting for opponent to join…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <p className="text-zinc-400">Phase: {phase}</p>
    </div>
  );
}
