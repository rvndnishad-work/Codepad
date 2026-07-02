import React from "react";

export function ReactSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-cyan-600 dark:text-cyan-400 animate-[spin_25s_linear_infinite]`}>
      <ellipse cx="50" cy="50" rx="8" ry="24" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(30 50 50)" className="opacity-80" />
      <ellipse cx="50" cy="50" rx="8" ry="24" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(90 50 50)" className="opacity-80" />
      <ellipse cx="50" cy="50" rx="8" ry="24" fill="none" stroke="currentColor" strokeWidth="2" transform="rotate(150 50 50)" className="opacity-80" />
      <circle cx="50" cy="50" r="4.5" fill="currentColor" className="animate-pulse" />
    </svg>
  );
}

export function NodeSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-green-600 dark:text-green-400`}>
      <polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      <polygon points="50,30 67,40 67,60 50,70 33,60 33,40" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90 animate-pulse" />
      <circle cx="50" cy="50" r="4.5" fill="currentColor" />
    </svg>
  );
}

export function NextSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-zinc-700 dark:text-zinc-300`}>
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      <path d="M 38 35 L 38 65 M 38 35 L 64 68 M 64 35 L 64 65" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" className="opacity-40 animate-[spin_12s_linear_infinite]" style={{ transformOrigin: "center" }} />
    </svg>
  );
}

export function JavaScriptSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-amber-500 dark:text-yellow-400`}>
      <path d="M 35 25 C 25 25, 25 40, 20 45 C 25 50, 25 65, 35 65" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 65 25 C 75 25, 75 40, 80 45 C 75 50, 75 65, 65 65" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="50" cy="45" r="9" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 3" className="animate-[spin_8s_linear_infinite]" />
      <circle cx="50" cy="45" r="3.5" fill="currentColor" />
    </svg>
  );
}

export function AngularSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-red-600 dark:text-red-400`}>
      <path d="M 50 15 L 80 25 L 75 65 L 50 85 L 25 65 L 20 25 Z" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      <path d="M 50 25 L 70 32 L 67 60 L 50 75 L 33 60 L 30 32 Z" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-90" />
      <circle cx="50" cy="50" r="6" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 2" className="animate-[spin_5s_linear_infinite]" />
    </svg>
  );
}

export function VueSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-emerald-600 dark:text-emerald-400`}>
      <path d="M 15 25 L 50 85 L 85 25 L 70 25 L 50 60 L 30 25 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <path d="M 33 25 L 50 54 L 67 25" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-75 animate-pulse" />
    </svg>
  );
}

export function TypeScriptSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-blue-600 dark:text-blue-400`}>
      <rect x="20" y="20" width="60" height="60" rx="10" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <text x="32" y="52" fill="currentColor" fontSize="22" fontWeight="bold" fontFamily="monospace">T</text>
      <text x="48" y="70" fill="currentColor" fontSize="22" fontWeight="bold" fontFamily="monospace">S</text>
      <path d="M 20 40 L 40 40 M 60 60 L 80 60" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-50" />
    </svg>
  );
}

export function DsaSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-purple-600 dark:text-purple-400`}>
      <line x1="50" y1="25" x2="30" y2="50" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      <line x1="50" y1="25" x2="70" y2="50" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      <line x1="30" y1="50" x2="20" y2="75" stroke="currentColor" strokeWidth="2" className="opacity-40" />
      <line x1="30" y1="50" x2="42" y2="75" stroke="currentColor" strokeWidth="2" className="opacity-40" />
      <circle cx="50" cy="25" r="6" fill="currentColor" className="animate-pulse" />
      <circle cx="30" cy="50" r="5" fill="currentColor" />
      <circle cx="70" cy="50" r="5" fill="currentColor" className="opacity-80" />
      <circle cx="20" cy="75" r="4" fill="currentColor" className="opacity-60" />
      <circle cx="42" cy="75" r="4" fill="currentColor" className="opacity-60" />
    </svg>
  );
}

export function SystemDesignSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-orange-600 dark:text-orange-400`}>
      <rect x="40" y="15" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="20" y="45" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="60" y="45" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 40 78 C 40 74 60 74 60 78 L 60 88 C 60 92 40 92 40 88 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 40 83 C 40 87 60 87 60 83" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 50 25 L 30 45 M 50 25 L 70 45 M 30 55 L 50 74 M 70 55 L 50 74" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="opacity-50" />
    </svg>
  );
}

export function PythonSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-emerald-600 dark:text-emerald-400`}>
      <path d="M 30 35 L 50 50 L 30 65" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="55" y1="65" x2="75" y2="65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="animate-pulse" />
      <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 8" className="opacity-40 animate-[spin_30s_linear_infinite]" />
    </svg>
  );
}

export function SqlSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-sky-600 dark:text-sky-400`}>
      <path d="M 30 25 C 30 18, 70 18, 70 25 L 70 35 C 70 42, 30 42, 30 35 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 30 25 C 30 32, 70 32, 70 25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 30 50 L 70 50 L 70 60 C 70 67, 30 67, 30 60 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M 30 50 C 30 57, 70 57, 70 50" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 75 35 Q 85 45 75 55" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="opacity-80 animate-pulse" />
    </svg>
  );
}

export function MachineCodingSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-indigo-600 dark:text-indigo-400`}>
      {/* browser frame */}
      <rect x="18" y="22" width="64" height="50" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <line x1="18" y1="34" x2="82" y2="34" stroke="currentColor" strokeWidth="2" />
      <circle cx="25" cy="28" r="2" fill="currentColor" />
      <circle cx="32" cy="28" r="2" fill="currentColor" className="opacity-70" />
      {/* assembling blocks */}
      <rect x="25" y="42" width="16" height="10" rx="2" fill="currentColor" className="opacity-80 animate-pulse" />
      <rect x="45" y="42" width="30" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      <rect x="45" y="54" width="22" height="6" rx="2" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50" />
      <rect x="25" y="56" width="16" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60" />
      {/* cursor */}
      <path d="M 70 60 L 70 76 L 74 72 L 77 79 L 80 77 L 77 70 L 82 70 Z" fill="currentColor" className="opacity-90" />
    </svg>
  );
}

export function FallbackSvg({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`${className} text-accent`}>
      <rect x="25" y="25" width="50" height="50" rx="6" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M 40 45 L 60 45 M 40 55 L 55 55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function TechSvg({ tech, className = "w-10 h-10" }: { tech: string; className?: string }) {
  switch (tech) {
    case "reactjs":
      return <ReactSvg className={className} />;
    case "nodejs":
      return <NodeSvg className={className} />;
    case "nextjs":
      return <NextSvg className={className} />;
    case "javascript":
    case "javascript-coding":
      return <JavaScriptSvg className={className} />;
    case "angular":
      return <AngularSvg className={className} />;
    case "vuejs":
      return <VueSvg className={className} />;
    case "typescript":
      return <TypeScriptSvg className={className} />;
    case "dsa":
      return <DsaSvg className={className} />;
    case "system-design":
      return <SystemDesignSvg className={className} />;
    case "python":
      return <PythonSvg className={className} />;
    case "sql":
      return <SqlSvg className={className} />;
    case "machine-coding":
      return <MachineCodingSvg className={className} />;
    default:
      return <FallbackSvg className={className} />;
  }
}
