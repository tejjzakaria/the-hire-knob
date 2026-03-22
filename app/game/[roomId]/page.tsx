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

function DifficultyBadge({ d }: { d: ScenarioForClient["difficulty"] }) {
  const styles = {
    easy: "bg-emerald-950 text-emerald-400 border-emerald-800",
    medium: "bg-amber-950 text-lime-400 border-amber-800",
    hard: "bg-rose-950 text-rose-400 border-rose-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${styles[d]}`}>
      {d}
    </span>
  );
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
  const [copiedCode, setCopiedCode] = useState(false);
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
    if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); timerIntervalRef.current = null; }
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
            fetch("/api/pusher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "timer-expired", roomCode: roomId }) }).catch(() => {});
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopTimer, roomId]);

  const stopNextRoundTimer = useCallback(() => {
    if (nextRoundIntervalRef.current) { clearInterval(nextRoundIntervalRef.current); nextRoundIntervalRef.current = null; }
  }, []);

  const startNextRoundTimer = useCallback((fromRound: number) => {
    stopNextRoundTimer();
    nextRoundTriggeredRef.current = false;
    setNextRoundTimer(NEXT_ROUND_SECONDS);
    nextRoundIntervalRef.current = setInterval(() => {
      setNextRoundTimer((t) => {
        if (t <= 1) {
          stopNextRoundTimer();
          if (!nextRoundTriggeredRef.current) {
            nextRoundTriggeredRef.current = true;
            fetch("/api/pusher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "next-round", roomCode: roomId, fromRound }) }).catch(() => {});
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [stopNextRoundTimer, roomId]);

  function handleSelectAnswer(idx: number) {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    selectedAnswerRef.current = idx;
    setPhase("answered");
    fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "select-answer", roomCode: roomId, playerId: meRef.current?.id, answerIndex: idx }),
    }).catch(() => {});
  }

  useEffect(() => {
    const playerId = localStorage.getItem("hire-knob-player-id");
    const playerName = localStorage.getItem("hire-knob-player-name");
    const playerSlot = localStorage.getItem("hire-knob-player-slot");
    if (!playerId || !playerName) { router.replace("/"); return; }
    meRef.current = { id: playerId, name: playerName, slot: Number(playerSlot) || 1 };

    const pusher = getPusherClient();
    const ch = pusher.subscribe(`game-${roomId}`);
    channelRef.current = ch;

    ch.bind("player-joined", (data: { player: PlayerInfo }) => {
      setPlayers((prev) => { if (prev.find((p) => p.id === data.player.id)) return prev; return [...prev, data.player]; });
      setGuestReady(true);
    });

    ch.bind("round-start", (data: { round: number; totalRounds: number; scenario: ScenarioForClient; roundStartTime: number }) => {
      setRound(data.round); currentRoundRef.current = data.round;
      setTotalRounds(data.totalRounds); setScenario(data.scenario); scenarioRef.current = data.scenario;
      setSelectedAnswer(null); selectedAnswerRef.current = null;
      setOpponentAnswered(false); setRevealData(null);
      setPhase("playing");
      startTimer(calculateTimerFromStart(data.roundStartTime));
    });

    ch.bind("answer-received", (data: { playerId: string }) => {
      if (meRef.current && data.playerId !== meRef.current.id) setOpponentAnswered(true);
    });

    ch.bind("round-reveal", (data: RevealPayload) => {
      stopTimer(); setRevealData(data); setScores(data.scores); setPlayers(data.players);
      setPhase("revealed"); startNextRoundTimer(currentRoundRef.current);
    });

    ch.bind("game-over", (data: GameOverPayload) => {
      stopTimer(); stopNextRoundTimer(); setFinalData(data);
      setScores(data.scores); setPlayers(data.players); setPhase("finished");
    });

    fetch("/api/pusher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "get-room", roomCode: roomId }) })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); setPhase("loading"); return; }
        const room = data.room;
        setPlayers(room.players ?? []); setScores(room.scores ?? {});
        if (room.status === "lobby") {
          if (room.players?.length >= 2) setGuestReady(true);
          setPhase("waiting");
          if (room.players?.length === 2 && !startedGameRef.current && meRef.current?.slot === 1) {
            startedGameRef.current = true;
            fetch("/api/pusher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start-game", roomCode: roomId }) }).catch(() => {});
          }
        } else if (room.status === "playing" && data.scenario) {
          setRound(data.round ?? 0); currentRoundRef.current = data.round ?? 0;
          setTotalRounds(data.totalRounds ?? 5); setScenario(data.scenario); scenarioRef.current = data.scenario;
          setPhase("playing"); startTimer(calculateTimerFromStart(data.roundStartTime ?? room.roundStartTime));
        }
      })
      .catch(() => setError("Connection error"));

    return () => { pusher.unsubscribe(`game-${roomId}`); stopTimer(); stopNextRoundTimer(); };
  }, [roomId, router, startTimer, stopTimer, startNextRoundTimer, stopNextRoundTimer]);

  if (error) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center"><p className="text-rose-400">{error}</p></div>;

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4 pt-8">
        <div className="max-w-lg mx-auto animate-pulse">
          <div className="h-4 bg-[#1a1a1a] rounded w-1/3 mb-6" />
          <div className="h-48 bg-[#1a1a1a] rounded-2xl mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-[#1a1a1a] rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8 text-center">
          <p className="text-[11px] font-semibold text-zinc-500 tracking-[0.18em] uppercase mb-6">Room code</p>
          <div className="text-5xl font-black text-lime-400 tracking-[0.25em] mb-6">{roomId}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(roomId).then(() => { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }); }}
            className="w-full py-2.5 rounded-xl border border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-zinc-600 text-sm font-medium transition-all mb-6"
          >
            {copiedCode ? "Copied!" : "Copy code"}
          </button>
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
            {guestReady ? "Both players ready — starting…" : "Waiting for opponent to join…"}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "instructions") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-8">
          <h2 className="text-2xl font-black text-white mb-6">How to play</h2>
          <ul className="space-y-4 text-sm text-zinc-400 mb-8">
            <li>Read the AI hiring decision and candidate profile</li>
            <li>Pick the bias that best explains the AI&apos;s choice</li>
            <li>You have 60 seconds per round</li>
            <li>Score a point for each correct answer</li>
          </ul>
          <p className="text-xs text-zinc-600 text-center">Starting first round…</p>
        </div>
      </div>
    );
  }

  if (phase === "playing" || phase === "answered") {
    const timerColor = timer > 30 ? "text-lime-400" : timer > 10 ? "text-orange-400" : "text-rose-400";
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4">
        <div className="max-w-lg mx-auto">
          {/* header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-500">Round {round + 1}/{totalRounds}</span>
            <span className={`font-mono font-bold text-lg ${timerColor}`}>{timer}s</span>
          </div>

          {/* candidate card */}
          {scenario && (
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-white font-bold text-sm">
                  {scenario.candidateInitials}
                </div>
                <div>
                  <p className="font-bold text-white">{scenario.candidateName}</p>
                  <p className="text-xs text-zinc-500">{scenario.role}</p>
                </div>
                <div className="ml-auto">
                  <DifficultyBadge d={scenario.difficulty} />
                </div>
              </div>
              <div className="space-y-1 text-xs mb-4">
                {Object.entries(scenario.profileFields).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-zinc-500 min-w-24">{k}</span>
                    <span className="text-zinc-300">{v}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#2a2a2a] pt-3">
                <p className="text-[11px] text-zinc-500 mb-1 uppercase tracking-wider">AI decision: {scenario.aiDecision}</p>
                <p className="text-xs text-zinc-400 italic">{scenario.aiRationale}</p>
              </div>
            </div>
          )}

          {/* answer options */}
          <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-3">What bias is this?</p>
          <div className="space-y-2">
            {scenario?.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectAnswer(idx)}
                  disabled={phase === "answered"}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm transition-all ${
                    isSelected
                      ? "border-lime-400 bg-lime-950 text-white"
                      : "border-[#2a2a2a] bg-[#1a1a1a] text-zinc-300 hover:border-zinc-600 hover:text-white disabled:opacity-60"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {phase === "answered" && (
            <p className="mt-4 text-center text-sm text-zinc-500">
              {opponentAnswered ? "Both answered — revealing…" : "Waiting for opponent…"}
            </p>
          )}
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
