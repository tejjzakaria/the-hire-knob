import Link from "next/link";
import { getAllResults, type GameResult } from "@/src/lib/results";
import { scenarios } from "@/src/data/scenarios";

function GameCard({ game }: { game: GameResult }) {
  const p1 = game.players.find((p) => p.slot === 1);
  const p2 = game.players.find((p) => p.slot === 2);
  const p1Score = p1 ? (game.scores[p1.id] ?? 0) : 0;
  const p2Score = p2 ? (game.scores[p2.id] ?? 0) : 0;
  const totalRounds = game.rounds.length;
  const winner = game.players.find((p) => p.id === game.winner);
  const isDraw = game.winner === null;

  // --------- format the date -----------
  const dateStr = new Date(game.playedAt).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      {/* Game header */}
      <div className="px-5 py-4 border-b border-[#1e1e1e] flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-zinc-600 bg-[#1a1a1a] border border-[#2a2a2a] px-2 py-0.5 rounded">
              #{game.roomCode}
            </span>
            <span className="text-xs text-zinc-600">{dateStr}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-white">
              {p1?.name ?? "—"}
              <span className="text-zinc-600 font-normal mx-1">vs</span>
              {p2?.name ?? "—"}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-black text-white tabular-nums">
            {p1Score}
            <span className="text-zinc-700 mx-1 text-lg font-bold">:</span>
            {p2Score}
          </p>
          <p className="text-[11px] font-semibold mt-0.5">
            {isDraw ? (
              <span className="text-zinc-500">Draw</span>
            ) : (
              <span className="text-lime-400">{winner?.name} wins</span>
            )}
          </p>
        </div>
      </div>

      {/* Score bars */}
      <div className="px-5 py-3 border-b border-[#1e1e1e] space-y-2">
        {game.players.map((player) => {
          const score = game.scores[player.id] ?? 0;
          const isWinner = player.id === game.winner;
          return (
            <div key={player.id} className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 w-20 shrink-0 truncate">{player.name}</span>
              <div className="flex-1 h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isWinner ? "bg-lime-400" : isDraw ? "bg-zinc-500" : "bg-zinc-700"}`}
                  style={{ width: totalRounds > 0 ? `${(score / totalRounds) * 100}%` : "0%" }}
                />
              </div>
              <span className={`text-xs font-bold tabular-nums w-8 text-right ${isWinner ? "text-lime-400" : "text-zinc-500"}`}>
                {score}/{totalRounds}
              </span>
            </div>
          );
        })}
      </div>

      {/* Round breakdown */}
      <div className="px-5">
        {game.rounds.length === 0 ? (
          <p className="text-xs text-zinc-700 py-4 italic">No round data recorded.</p>
        ) : (
          game.rounds.map((round) => {
            // --------- look up the scenario -----------
            const scenario = scenarios.find((s) => s.id === round.scenarioId) ?? null;
            if (!scenario) return null;
            const correctLabel = scenario.options[round.correctIndex]?.label ?? "—";

            return (
              <div key={round.roundIndex} className="py-3 border-b border-[#1e1e1e] last:border-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                      Round {round.roundIndex + 1}
                    </span>
                    <p className="text-sm font-semibold text-zinc-200 mt-0.5">{scenario.candidateName}</p>
                    <p className="text-xs text-zinc-500">{scenario.role}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-lime-400 bg-lime-400/10 border border-lime-400/20 px-2 py-0.5 rounded shrink-0">
                    {scenario.difficulty}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 mb-2">
                  <span className="text-zinc-600">Correct: </span>
                  <span className="text-zinc-400">{correctLabel}</span>
                </p>
                <div className="flex flex-col gap-1">
                  {game.players.map((player) => {
                    const answerIdx = round.answers[player.id];
                    const answered = answerIdx !== null && answerIdx !== undefined;
                    const correct = answered && answerIdx === round.correctIndex;
                    const label = answered ? scenario.options[answerIdx]?.label : null;
                    return (
                      <div key={player.id} className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            correct ? "bg-emerald-700" : answered ? "bg-rose-900" : "bg-[#222]"
                          }`}
                        >
                          {correct ? (
                            <svg className="w-2.5 h-2.5 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-2.5 h-2.5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                        </span>
                        <span className="text-xs text-zinc-500 w-20 shrink-0 truncate">{player.name}</span>
                        <span className={`text-xs truncate ${correct ? "text-emerald-400" : answered ? "text-zinc-500" : "text-zinc-700 italic"}`}>
                          {label ?? "Timed out"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default async function ResultsPage() {
  // --------- get all results -----------
  const results = await getAllResults();

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-lime-400 transition-colors mb-4"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to lobby
          </Link>
          <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-lime-400">
            Admin
          </span>
          <h1 className="text-3xl font-black text-white mt-1">Game Results</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {results.length === 0
              ? "No games played yet."
              : `${results.length} game${results.length === 1 ? "" : "s"} recorded`}
          </p>
        </div>

        {results.length === 0 ? (
          <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-10 text-center">
            <p className="text-zinc-600 text-sm">Results will appear here once games are completed.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {results.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
