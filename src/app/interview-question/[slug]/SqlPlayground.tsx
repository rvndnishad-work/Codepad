"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Loader2 } from "lucide-react";
import CodeMirrorEditor from "./CodeMirrorEditor";

type SqlPlaygroundProps = {
  code: string;
  label?: string;
  title?: string;
  description?: string;
};

export default function SqlPlayground({ code, label, title, description }: SqlPlaygroundProps) {
  const [query, setQuery] = useState(code.trim());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ columns: string[]; values: any[][] }[] | null>(null);
  const [schemaText, setSchemaText] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const dbRef = useRef<any>(null);
  const sqlJsRef = useRef<any>(null);

  // Initialize sql.js and create in-memory database
  useEffect(() => {
    let active = true;
    async function initDb() {
      try {
        setLoading(true);
        if (!(window as any).initSqlJs) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load sql.js CDN"));
            document.head.appendChild(script);
          });
        }

        if (!active) return;

        const initSqlJs = (window as any).initSqlJs;
        const SQL = await initSqlJs({
          locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`,
        });
        sqlJsRef.current = SQL;

        const db = new SQL.Database();
        dbRef.current = db;

        // Parse any schemas/seeds from description and run them
        if (description) {
          const sqlBlocks = description.match(/```sql([\s\S]*?)```/g);
          if (sqlBlocks) {
            const schemas: string[] = [];
            for (const block of sqlBlocks) {
              const sqlCode = block.replace(/```sql|```/g, "").trim();
              schemas.push(sqlCode);
              const schemaQueries = sqlCode
                .split(";")
                .map((q) => q.trim())
                .filter((q) => q && !q.toLowerCase().startsWith("select"));
              
              for (const q of schemaQueries) {
                try {
                  db.run(q);
                } catch (e) {
                  console.warn("Failed to run seed query:", q, e);
                }
              }
            }
            setSchemaText(schemas.join("\n\n"));
          }
        }
        setError(null);
      } catch (err: any) {
        console.error("SQL initialization error:", err);
        setError("Failed to initialize SQLite WASM environment.");
      } finally {
        setLoading(false);
      }
    }

    initDb();

    return () => {
      active = false;
      if (dbRef.current) {
        dbRef.current.close();
      }
    };
  }, [description]);

  function handleReset() {
    setQuery(code.trim());
    setResults(null);
    setError(null);
  }

  function handleRun() {
    if (!dbRef.current) {
      setError("Database is not initialized yet.");
      return;
    }
    setError(null);
    setResults(null);
    setLoading(true);

    setTimeout(() => {
      try {
        const queryText = query.trim();
        if (!queryText) {
          setResults([]);
          setLoading(false);
          return;
        }

        const res = dbRef.current.exec(queryText);
        setResults(res);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }, 50);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-b border-border bg-bg/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-sky-500/15 text-sky-500 border border-sky-500/20">
            <span className="w-1.5 h-1.5 rounded-sm bg-sky-500" /> SQL
          </span>
          {label && <span className="text-xs font-bold text-muted truncate">{label}</span>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-elevated transition"
            title="Reset query"
          >
            <span className="sr-only">Reset</span>
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRun}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent text-bg text-xs font-black uppercase tracking-wider hover:bg-accent-soft transition disabled:opacity-60 shadow-sm"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            Run Query
          </button>
        </div>
      </div>

      {/* Schema Reference Panel */}
      {schemaText && (
        <div className="border-b border-border bg-bg/25">
          <button
            onClick={() => setShowSchema(!showSchema)}
            className="flex items-center justify-between w-full px-4 py-2.5 text-left text-xs font-bold text-muted hover:text-fg hover:bg-elevated/40 transition"
          >
            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black">
              📊 Database Schema Reference
            </span>
            <span className="text-[10px] text-accent font-black uppercase">
              {showSchema ? "Hide Schema" : "Show Schema"}
            </span>
          </button>
          {showSchema && (
            <div className="p-4 border-t border-border bg-bg/10 max-h-48 overflow-y-auto font-mono text-[11px] text-muted whitespace-pre-wrap leading-relaxed">
              {schemaText}
            </div>
          )}
        </div>
      )}

      {/* Editor */}
      <div>
        <CodeMirrorEditor value={query} onChange={setQuery} technology="sql" />
      </div>

      {/* Results output */}
      {(results !== null || error !== null || loading) && (
        <div className="border-t border-border bg-bg/60 p-4 max-h-80 overflow-auto">
          {loading ? (
            <div className="text-muted flex items-center gap-1.5 font-mono text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> executing query…
            </div>
          ) : error ? (
            <div className="text-rose-600 dark:text-rose-400 font-mono text-xs whitespace-pre-wrap">
              Error: {error}
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-4">
              {results.map((res, i) => (
                <div key={i} className="overflow-x-auto rounded-xl border border-border bg-surface/50">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="bg-bg/85 border-b border-border">
                        {res.columns.map((col) => (
                          <th key={col} className="p-2 font-black uppercase text-muted tracking-wider border-r border-border/40 last:border-0">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {res.values.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-border/40 last:border-0 hover:bg-bg/20">
                          {row.map((val, colIdx) => (
                            <td key={colIdx} className="p-2 border-r border-border/40 last:border-0 whitespace-nowrap text-fg/90">
                              {val === null ? <span className="text-muted/50 italic">NULL</span> : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-emerald-600 dark:text-emerald-400 font-mono text-xs">
              Query executed successfully. (No rows returned / 0 rows affected)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
