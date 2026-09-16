/**
 * Console d'Exécution des Tests Unitaires & TNR en Direct
 * Permet aux relecteurs et auditeurs de valider immédiatement les invariants SOLID et TNR.
 */

import React, { useState } from 'react';
import { runAllInAppTests, TestResultItem } from '../../testing/inAppTestRunner';
import { Play, CheckCircle2, XCircle, ShieldCheck, RefreshCw, Terminal } from 'lucide-react';

export const LiveTestConsole: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResultItem[] | null>(null);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await runAllInAppTests();
      setResults(res);
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = results?.filter((r) => r.status === 'passed').length ?? 0;
  const totalCount = results?.length ?? 0;

  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-xl p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-100 flex items-center gap-2">
              <span>Harnais de Tests Unitaires & Non-Régression (TNR)</span>
              {results && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    passedCount === totalCount
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {passedCount}/{totalCount} validés
                </span>
              )}
            </h4>
            <p className="text-[11px] text-zinc-400">
              Exécute en direct les assertions réelles du contrat OpenAPI, de l'isolation tenant et du versioning.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Exécution en cours...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Lancer la Suite de Tests</span>
            </>
          )}
        </button>
      </div>

      {results && (
        <div className="space-y-2 animate-in fade-in duration-200">
          {results.map((res) => (
            <div
              key={res.id}
              className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5">
                {res.status === 'passed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-indigo-400 font-semibold bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-900/40">
                      {res.id}
                    </span>
                    <span className="font-semibold text-zinc-200">{res.name}</span>
                  </div>
                  {res.details && (
                    <p className="text-[11px] text-zinc-400 mt-1">{res.details}</p>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-[10px] text-zinc-400">
                  {res.durationMs} ms
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
