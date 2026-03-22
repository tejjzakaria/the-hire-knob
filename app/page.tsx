"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

function getOrCreatePlayerId(): string {
  let id = localStorage.getItem("hire-knob-player-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("hire-knob-player-id", id);
  }
  return id;
}

export default function LobbyPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("hire-knob-player-name");
    if (saved) setPlayerName(saved);
  }, []);

  async function handleCreateRoom() {
    if (!playerName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const playerId = getOrCreatePlayerId();
      const res = await fetch("/api/pusher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-room",
          playerId,
          playerName: playerName.trim(),
        }),
      });
      const data = await res.json();
      localStorage.setItem("hire-knob-player-name", playerName.trim());
      localStorage.setItem("hire-knob-player-slot", "1");
      localStorage.setItem("hire-knob-room-code", data.roomCode);
      router.push(`/game/${data.roomCode}`);
    } catch {
      setError("Could not create room. Please try again.");
      setLoading(false);
    }
  }

  async function handleJoinRoom() {
    const code = joinCode.trim();
    if (!playerName.trim() || code.length !== 4) return;
    setLoading(true);
    setError("");
    try {
      const playerId = getOrCreatePlayerId();
      const res = await fetch("/api/pusher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join-room",
          playerId,
          playerName: playerName.trim(),
          roomCode: code,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Room not found or already full.");
        setLoading(false);
        return;
      }
      localStorage.setItem("hire-knob-player-name", playerName.trim());
      localStorage.setItem("hire-knob-player-slot", "2");
      localStorage.setItem("hire-knob-room-code", code);
      router.push(`/game/${code}`);
    } catch {
      setError("Could not join room. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ------------ brand header ------------ */}
        <div className="mb-10">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
          >
            <span className="inline-block text-[11px] font-semibold tracking-[0.18em] uppercase text-lime-400 mb-4">
              Bias Detection Game
            </span>
            <h1 className="text-[2.6rem] font-black text-white leading-none tracking-tight">
              The Hire<br />Knob
            </h1>
            <p className="mt-3 text-zinc-400 text-sm">
              Two players. Five rounds. Can you spot the AI bias?
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-5 flex items-center gap-5 text-xs text-zinc-600"
          >
            <span>2 players</span>
            <span className="w-px h-3 bg-zinc-800" />
            <span>5 rounds</span>
            <span className="w-px h-3 bg-zinc-800" />
            <span>60s timer</span>
          </motion.div>
        </div>

        {/* ------------ card ------------ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="bg-[#1a1a1a] rounded-2xl border border-[#2a2a2a] p-5"
        >
          {/* ------------ name input ------------ */}
          <div className="mb-4">
            <label
              htmlFor="player-name"
              className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2"
            >
              Your name
            </label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  mode === "create" ? handleCreateRoom() : handleJoinRoom();
              }}
              placeholder="e.g. Alex"
              maxLength={24}
              autoComplete="off"
              className="w-full px-4 py-3 rounded-xl bg-[#111] border border-[#2a2a2a] text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* ------------ mode tabs ------------ */}
          <div className="relative flex rounded-xl overflow-hidden border border-[#2a2a2a] mb-4 bg-[#111]">
            {(["create", "join"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`relative flex-1 py-2.5 text-sm font-semibold transition-colors z-10 ${
                  mode === m ? "text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {mode === m && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0.5 bg-lime-400 rounded-[10px]"
                    transition={{ type: "spring", bounce: 0.22, duration: 0.4 }}
                  />
                )}
                <span className="relative">
                  {m === "create" ? "Create" : "Join"}
                </span>
              </button>
            ))}
          </div>

          {/* ------------ tab content ------------ */}
          <AnimatePresence mode="wait">
            {mode === "create" ? (
              <motion.div
                key="create-content"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
              >
                <button
                  onClick={handleCreateRoom}
                  disabled={!playerName.trim() || loading}
                  className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Creating…
                    </span>
                  ) : (
                    "Create room"
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="join-content"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                <div>
                  <label
                    htmlFor="join-code"
                    className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-widest mb-2"
                  >
                    Room code
                  </label>
                  <input
                    id="join-code"
                    type="text"
                    inputMode="numeric"
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleJoinRoom();
                    }}
                    placeholder="0000"
                    maxLength={4}
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-xl bg-[#111] border border-[#2a2a2a] text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-transparent transition-all text-center text-2xl font-bold tracking-[0.4em]"
                  />
                </div>
                <button
                  onClick={handleJoinRoom}
                  disabled={!playerName.trim() || joinCode.length !== 4 || loading}
                  className="w-full py-3 rounded-xl bg-lime-400 hover:bg-lime-300 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm transition-all"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Joining…
                    </span>
                  ) : (
                    "Join room"
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-sm text-rose-400 text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}
