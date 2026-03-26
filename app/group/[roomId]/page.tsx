"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Pusher from "pusher-js";

const PAGE = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

interface PlayerInfo {
  id: string;
  name: string;
  slot: number;
}

interface ScenarioForClient {
  id: number;
  candidateName: string;
  candidateInitials: string;
  role: string;
  aiDecision: string;
  profileFields: Record<string, string>;
  aiRationale: string;
  difficulty: string;
  explanation: string;
  options: { label: string }[];
}

interface Ranking {
  id: string;
  name: string;
  score: number;
}

type Phase =
  | "loading"
  | "lobby"
  | "countdown"
  | "playing"
  | "answered"
  | "revealed"
  | "finished";

export default function GroupGamePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  // --------- identity -----------
  const meRef = useRef<PlayerInfo | null>(null);
  const [isHost, setIsHost] = useState(false);

  // --------- game state -----------
  const [phase, setPhase] = useState<Phase>("loading");
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [scenario, setScenario] = useState<ScenarioForClient | null>(null);
  const scenarioRef = useRef<ScenarioForClient | null>(null);
  const [round, setRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(5);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const selectedAnswerRef = useRef<number | null>(null);
  const [answerCount, setAnswerCount] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // --------- reveal data -----------
  const [correctIndex, setCorrectIndex] = useState<number | null>(null);
  const [distribution, setDistribution] = useState<Record<number, number>>({});
  const [myAnswerCorrect, setMyAnswerCorrect] = useState<boolean | null>(null);

  // --------- timer -----------
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --------- countdown -----------
  const [countdownValue, setCountdownValue] = useState(3);

  // --------- finished -----------
  const [rankings, setRankings] = useState<Ranking[]>([]);

  // --------- error -----------
  const [error, setError] = useState("");

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      setTimeLeft(seconds);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopTimer();
            // trigger timer expired
            fetch("/api/pusher", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "group-timer-expired", roomCode: roomId }),
            }).catch(() => {});
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer, roomId]
  );

  // --------- countdown effect -----------
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownValue <= 0) {
      setPhase("playing");
      startTimer(60);
      return;
    }
    const t = setTimeout(() => setCountdownValue((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdownValue, startTimer]);

  // --------- lobby poll: refresh player list every 3s -----------
  useEffect(() => {
    if (phase !== "lobby") return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch("/api/pusher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-group-room", roomCode: roomId }),
        });
        const data = await res.json();
        if (data.error) return;
        const room = data.room;
        setPlayers(room.players ?? []);
        setTotalPlayers(Math.max(0, (room.players?.length ?? 1) - 1));
        // If host started the game while we were polling, the Pusher event handles it
        if (room.status === "playing" && data.scenario) {
          setRound(data.round ?? 0);
          setTotalRounds(data.totalRounds ?? 5);
          setScenario(data.scenario);
          scenarioRef.current = data.scenario;
          setCountdownValue(3);
          setPhase("countdown");
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(poll);
  }, [phase, roomId]);

  // --------- Pusher + initial load -----------
  useEffect(() => {
    const playerId = localStorage.getItem("hire-knob-player-id") ?? "";
    const playerName = localStorage.getItem("hire-knob-player-name") ?? "Player";
    meRef.current = { id: playerId, name: playerName, slot: 0 };

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const ch = pusher.subscribe(`game-${roomId}`);

    ch.bind("player-joined", (data: { player: PlayerInfo; playerCount: number }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.player.id)) return prev;
        return [...prev, data.player];
      });
      setTotalPlayers(data.playerCount - 1); // minus host
    });

    ch.bind(
      "group-round-start",
      (data: {
        round: number;
        totalRounds: number;
        scenario: ScenarioForClient;
        roundStartTime: number;
      }) => {
        stopTimer();
        setRound(data.round);
        setTotalRounds(data.totalRounds);
        setScenario(data.scenario);
        scenarioRef.current = data.scenario;
        setSelectedAnswer(null);
        selectedAnswerRef.current = null;
        setAnswerCount(0);
        setCorrectIndex(null);
        setDistribution({});
        setMyAnswerCorrect(null);
        setCountdownValue(3);
        setPhase("countdown");
      }
    );

    ch.bind(
      "group-answer-count",
      (data: { answerCount: number; totalPlayers: number }) => {
        setAnswerCount(data.answerCount);
        setTotalPlayers(data.totalPlayers);
      }
    );

    ch.bind(
      "group-round-reveal",
      (data: {
        correctIndex: number;
        answers: Record<string, number | null>;
        distribution: Record<number, number>;
        scores: Record<string, number>;
        totalPlayers: number;
      }) => {
        stopTimer();
        setCorrectIndex(data.correctIndex);
        setDistribution(data.distribution);
        setScores(data.scores);
        setTotalPlayers(data.totalPlayers);
        // Check if my answer was correct
        const myId = meRef.current?.id;
        if (myId && data.answers[myId] !== undefined) {
          setMyAnswerCorrect(data.answers[myId] === data.correctIndex);
        } else {
          setMyAnswerCorrect(null);
        }
        setPhase("revealed");
      }
    );

    ch.bind("group-game-over", (data: { rankings: Ranking[] }) => {
      stopTimer();
      setRankings(data.rankings);
      setPhase("finished");
    });

    // --------- initial room load -----------
    fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-group-room", roomCode: roomId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        const room = data.room;
        setPlayers(room.players ?? []);
        setScores(room.scores ?? {});
        setTotalRounds(room.totalRounds ?? 5);
        setTotalPlayers(Math.max(0, (room.players?.length ?? 1) - 1));

        const host = room.hostId === playerId;
        setIsHost(host);

        if (room.status === "lobby") {
          setPhase("lobby");
        } else if (room.status === "playing" && data.scenario) {
          setRound(data.round ?? 0);
          setTotalRounds(data.totalRounds ?? 5);
          setScenario(data.scenario);
          scenarioRef.current = data.scenario;
          if (room.revealed) {
            setPhase("revealed");
          } else {
            setPhase("playing");
            const elapsed = Math.floor(
              (Date.now() - (data.roundStartTime ?? room.roundStartTime)) / 1000
            );
            startTimer(Math.max(0, 60 - elapsed));
          }
        } else if (room.status === "finished") {
          setPhase("finished");
        }
      })
      .catch(() => setError("Connection error"));

    return () => {
      stopTimer();
      ch.unbind_all();
      pusher.unsubscribe(`game-${roomId}`);
      pusher.disconnect();
    };
  }, [roomId, stopTimer, startTimer]);

  // --------- handlers -----------

  function handleStartGame() {
    fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "group-start-game",
        roomCode: roomId,
        playerId: meRef.current?.id,
      }),
    }).catch(() => {});
  }

  function handleSelectAnswer(idx: number) {
    if (selectedAnswerRef.current !== null || isHost) return;
    selectedAnswerRef.current = idx;
    setSelectedAnswer(idx);
    setPhase("answered");
    fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "group-select-answer",
        roomCode: roomId,
        playerId: meRef.current?.id,
        answerIndex: idx,
      }),
    }).catch(() => {});
  }

  function handleNextRound() {
    fetch("/api/pusher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "group-next-round",
        roomCode: roomId,
        playerId: meRef.current?.id,
      }),
    }).catch(() => {});
  }

  // --------- render -----------

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-xl bg-lime-400 text-black font-bold text-sm"
          >
            Back to lobby
          </button>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // =================== LOBBY ===================
  if (phase === "lobby") {
    const playerCount = players.filter((p) => p.id !== (isHost ? meRef.current?.id : "")).length;
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <motion.div className="w-full max-w-sm" {...PAGE}>
          <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-6">
            {/* Room code */}
            <div className="text-center mb-6">
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-lime-400">
                Room code
              </span>
              <p className="text-4xl font-black text-white tracking-[0.3em] mt-1">
                {roomId}
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Share this code with your players
              </p>
            </div>

            {/* Player count */}
            <div className="bg-[#111] rounded-xl border border-[#2a2a2a] p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                  Players joined
                </span>
                <span className="text-lg font-black text-lime-400 tabular-nums">
                  {isHost ? players.length - 1 : playerCount}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1.5">
                {players
                  .filter((p) => !(isHost && p.id === meRef.current?.id))
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[10px] font-bold text-zinc-500">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      {p.name}
                    </div>
                  ))}
                {players.length <= 1 && (
                  <p className="text-xs text-zinc-700 italic">
                    Waiting for players...
                  </p>
                )}
              </div>
            </div>

            {/* Game info */}
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-600 mb-4">
              <span>{totalRounds} rounds</span>
              <span className="w-px h-3 bg-zinc-800" />
              <span>60s timer</span>
            </div>

            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={players.length < 2}
                className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all"
              >
                {players.length < 2
                  ? "Waiting for players..."
                  : `Start game (${players.length - 1} player${players.length - 1 === 1 ? "" : "s"})`}
              </button>
            ) : (
              <div className="text-center py-3">
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                  <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
                  Waiting for host to start...
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // =================== COUNTDOWN ===================
  if (phase === "countdown") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownValue}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-center"
          >
            <p className="text-[11px] font-semibold text-zinc-500 tracking-[0.18em] uppercase mb-4">
              Round {round + 1} of {totalRounds}
            </p>
            <span className="text-8xl font-black text-lime-400">
              {countdownValue || "Go!"}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // =================== PLAYING (host + player) ===================
  if (phase === "playing" || phase === "answered") {
    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header bar */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Round {round + 1}/{totalRounds}
            </span>
            <div className="flex items-center gap-3">
              {isHost && (
                <span className="text-xs text-zinc-500">
                  {answerCount}/{totalPlayers} answered
                </span>
              )}
              <span
                className={`text-lg font-black tabular-nums ${
                  timeLeft <= 10 ? "text-rose-400" : "text-white"
                }`}
              >
                {timeLeft}s
              </span>
            </div>
          </div>

          {scenario && (
            <motion.div {...PAGE}>
              {/* Candidate card */}
              <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 mb-4">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center text-lime-400 font-bold text-sm shrink-0">
                    {scenario.candidateInitials}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {scenario.candidateName}
                    </h2>
                    <p className="text-sm text-zinc-500">{scenario.role}</p>
                  </div>
                  <div className="ml-auto shrink-0">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold ${
                        scenario.aiDecision === "hired"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {scenario.aiDecision === "hired" ? "Hired" : "Rejected"}
                    </span>
                  </div>
                </div>

                {/* Profile fields */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                  {Object.entries(scenario.profileFields).map(([key, val]) => (
                    <div key={key}>
                      <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                        {key}
                      </span>
                      <p className="text-sm text-zinc-300">{val}</p>
                    </div>
                  ))}
                </div>

                {/* AI rationale */}
                <div className="bg-[#111] rounded-xl p-3 border border-[#222]">
                  <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                    AI Rationale
                  </span>
                  <p className="text-sm text-zinc-400 mt-1">
                    {scenario.aiRationale}
                  </p>
                </div>
              </div>

              {/* Question */}
              <p className="text-sm font-semibold text-zinc-300 mb-3">
                What bias best explains this AI decision?
              </p>

              {/* Answer options (players only) */}
              {isHost ? (
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5">
                  <div className="flex items-center justify-center gap-2 text-zinc-400">
                    <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">
                      Waiting for answers... {answerCount}/{totalPlayers}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4 h-2 bg-[#111] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-lime-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: totalPlayers > 0
                          ? `${(answerCount / totalPlayers) * 100}%`
                          : "0%",
                      }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              ) : phase === "answered" ? (
                <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 text-center">
                  <p className="text-sm text-zinc-400">
                    Answer locked in! Waiting for results...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {scenario.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectAnswer(idx)}
                      className="w-full text-left px-4 py-3.5 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-zinc-300 hover:border-lime-400/40 hover:bg-lime-400/5 active:scale-[0.98] transition-all font-medium"
                    >
                      <span className="text-lime-400 font-bold mr-2">
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // =================== REVEALED ===================
  if (phase === "revealed" && scenario) {
    const maxCount = Math.max(1, ...Object.values(distribution));

    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4">
        <div className="max-w-2xl mx-auto">
          <motion.div {...PAGE}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
                Round {round + 1}/{totalRounds} — Results
              </span>
            </div>

            {/* Player result (non-host only) */}
            {!isHost && (
              <div
                className={`rounded-2xl border p-5 mb-4 text-center ${
                  myAnswerCorrect
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : myAnswerCorrect === false
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-[#1a1a1a] border-[#2a2a2a]"
                }`}
              >
                <p className="text-2xl font-black mb-1">
                  {myAnswerCorrect
                    ? "Correct!"
                    : myAnswerCorrect === false
                    ? "Wrong!"
                    : "Time's up!"}
                </p>
                <p className="text-sm text-zinc-400">
                  The answer was:{" "}
                  <span className="text-lime-400 font-semibold">
                    {scenario.options[correctIndex ?? 0]?.label}
                  </span>
                </p>
              </div>
            )}

            {/* Distribution chart (everyone sees this) */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 mb-4">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-4">
                Answer distribution
              </p>
              <div className="space-y-3">
                {scenario.options.map((opt, idx) => {
                  const count = distribution[idx] ?? 0;
                  const isCorrect = idx === correctIndex;
                  const isMyPick = !isHost && selectedAnswer === idx;
                  const isMyWrongPick = isMyPick && !isCorrect;
                  const pct =
                    totalPlayers > 0
                      ? Math.round((count / totalPlayers) * 100)
                      : 0;
                  return (
                    <div key={idx} className={`rounded-lg px-2 py-1.5 -mx-2 ${isMyWrongPick ? "bg-rose-500/5 ring-1 ring-rose-500/20" : isMyPick ? "bg-lime-400/5 ring-1 ring-lime-400/20" : ""}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-sm font-medium ${
                            isCorrect ? "text-lime-400" : isMyWrongPick ? "text-rose-400" : "text-zinc-400"
                          }`}
                        >
                          <span className="font-bold mr-1">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {opt.label}
                          {isCorrect && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-lime-400">
                              Correct
                            </span>
                          )}
                          {isMyWrongPick && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-rose-400">
                              Your answer
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 tabular-nums">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-[#111] rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            isCorrect ? "bg-lime-400" : isMyWrongPick ? "bg-rose-400" : "bg-zinc-700"
                          }`}
                          initial={{ width: 0 }}
                          animate={{
                            width:
                              maxCount > 0
                                ? `${(count / maxCount) * 100}%`
                                : "0%",
                          }}
                          transition={{ duration: 0.5, delay: idx * 0.1 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-600 mt-3">
                {Object.values(distribution).reduce((a, b) => a + b, 0)} of{" "}
                {totalPlayers} players answered
              </p>
            </div>

            {/* Explanation */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5 mb-4">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                Explanation
              </p>
              <p className="text-sm text-zinc-400">{scenario.explanation}</p>
            </div>

            {/* Host: Next round button */}
            {isHost && (
              <button
                onClick={handleNextRound}
                className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-black font-bold text-sm transition-all"
              >
                {round + 1 >= totalRounds ? "Show results" : "Next round"}
              </button>
            )}

            {/* Player: waiting */}
            {!isHost && (
              <div className="text-center py-3">
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
                  <div className="w-4 h-4 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
                  Waiting for host...
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // =================== FINISHED — PODIUM ===================
  if (phase === "finished") {
    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);
    const myId = meRef.current?.id;
    const myRank = rankings.findIndex((r) => r.id === myId) + 1;

    // Podium order: [2nd, 1st, 3rd] for visual layout
    const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
    const podiumHeights = ["h-24", "h-32", "h-20"];
    const podiumLabels = ["2nd", "1st", "3rd"];
    const podiumColors = [
      "border-zinc-500 text-zinc-400",
      "border-lime-400 text-lime-400",
      "border-orange-400 text-orange-400",
    ];

    return (
      <div className="min-h-screen bg-[#0f0f0f] p-4">
        <div className="max-w-lg mx-auto">
          <motion.div {...PAGE}>
            <div className="text-center mb-8">
              <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-lime-400">
                Game over
              </span>
              <h1 className="text-3xl font-black text-white mt-1">
                Final results
              </h1>
              {!isHost && myRank > 0 && (
                <p className="text-sm text-zinc-500 mt-1">
                  You finished #{myRank} of {rankings.length}
                </p>
              )}
            </div>

            {/* Podium */}
            {top3.length > 0 && (
              <div className="flex items-end justify-center gap-3 mb-8">
                {podiumOrder.map((player, i) => {
                  if (!player) return <div key={i} className="w-24" />;
                  return (
                    <motion.div
                      key={player.id}
                      className="flex flex-col items-center"
                      initial={{ y: 40, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 + i * 0.15 }}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-sm font-bold text-white mb-2">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-white truncate max-w-[5rem] mb-1">
                        {player.name}
                      </p>
                      <p className="text-lg font-black text-white mb-2">
                        {player.score}
                      </p>
                      <div
                        className={`w-20 ${podiumHeights[i]} rounded-t-xl border-t-2 ${podiumColors[i]} bg-[#1a1a1a] flex items-start justify-center pt-2`}
                      >
                        <span className="text-xs font-bold">
                          {podiumLabels[i]}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full leaderboard */}
            {rest.length > 0 && (
              <div className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-4 mb-6">
                <div className="space-y-2">
                  {rest.map((player, i) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                        player.id === myId
                          ? "bg-lime-400/5 border border-lime-400/20"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-600 w-6 text-right">
                          {i + 4}.
                        </span>
                        <span className="text-sm text-zinc-300">
                          {player.name}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-zinc-400 tabular-nums">
                        {player.score}/{totalRounds}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Back button */}
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] text-black font-bold text-sm transition-all"
            >
              Back to lobby
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
