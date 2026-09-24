"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Database, Loader2, Play, RotateCcw, XCircle } from "lucide-react";
import CodeMirrorEditor from "./CodeMirrorEditor";
import { LANG_COLOR, badge, frame, frameBar, frameLabel, iconBtn, runBtn } from "./_components/codeFrame";

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
        setError("The SQL runner could not load. Check your connection and reload the page.");
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
    <div className={frame}>
      <div className={frameBar}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={badge}>
            <span className="h-2 w-2 rounded-full" style={{ background: LANG_COLOR.sql }} aria-hidden /> SQL
          </span>
          {label && <span className={frameLabel}>{label}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button type="button" onClick={handleReset} className={iconBtn} title="Reset query" aria-label="Reset query">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button type="button" onClick={handleRun} disabled={loading} className={runBtn}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5 fill-current" aria-hidden />}
            Run query
          </button>
        </div>
      </div>

      {schemaText && (
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setShowSchema(!showSchema)}
            aria-expanded={showSchema}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] text-muted transition-colors hover:bg-panel hover:text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent motion-reduce:transition-none"
          >
            <span className="flex items-center gap-2 font-medium">
              <Database className="h-4 w-4 text-subtle" aria-hidden /> Tables for this question
            </span>
            <ChevronDown className={`h-4 w-4 text-subtle transition-transform motion-reduce:transition-none ${showSchema ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {showSchema && (
            <pre className="qa-code-scroll m-0 max-h-56 overflow-auto border-t border-border bg-bg/40 px-4 py-3 font-mono text-[12.5px] leading-relaxed text-muted">
              {schemaText}
            </pre>
          )}
        </div>
      )}

      <div>
        <CodeMirrorEditor value={query} onChange={setQuery} technology="sql" />
      </div>

      {(results !== null || error !== null || loading) && (
        <div className="qa-code-scroll max-h-80 overflow-auto border-t border-border bg-bg/50 p-4" aria-live="polite">
          {loading ? (
            <p className="flex items-center gap-2 text-[13px] text-subtle">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Running the query…
            </p>
          ) : error ? (
            <p className="flex items-start gap-2 whitespace-pre-wrap font-mono text-[12.5px] text-danger">
              <XCircle className="mt-px h-4 w-4 shrink-0" aria-hidden /> {error}
            </p>
          ) : results && results.length > 0 ? (
            <div className="space-y-4">
              {results.map((res, i) => (
                <div key={i}>
                  <p className="mb-2 text-xs text-subtle">
                    <span className="tabular-nums">{res.values.length}</span> {res.values.length === 1 ? "row" : "rows"}
                  </p>
                  <div className="qa-code-scroll overflow-x-auto rounded-xl border border-border bg-surface">
                    <table className="w-full border-collapse text-left font-mono text-[12.5px]">
                      <thead>
                        <tr className="border-b border-border bg-panel">
                          {res.columns.map((col) => (
                            <th key={col} scope="col" className="whitespace-nowrap px-3 py-2 font-medium text-muted">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {res.values.map((row, rowIdx) => (
                          <tr key={rowIdx} className="border-b border-border last:border-0 hover:bg-panel/60">
                            {row.map((val, colIdx) => (
                              <td key={colIdx} className="whitespace-nowrap px-3 py-2 text-fg/90 tabular-nums">
                                {val === null ? <span className="italic text-subtle">NULL</span> : String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-[13px] text-success">
              <CheckCircle2 className="h-4 w-4" aria-hidden /> The query ran. It returned no rows.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
