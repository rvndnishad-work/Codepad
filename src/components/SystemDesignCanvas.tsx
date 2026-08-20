"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Square,
  Circle,
  Type,
  ArrowRight,
  Trash2,
  Download,
  RotateCcw,
  Layers,
  Database,
  Server,
  Cloud,
  Globe,
  Lock,
  Cpu,
} from "lucide-react";

type NodeKind = "rectangle" | "circle" | "text" | "database" | "server" | "cloud" | "gateway";

interface CanvasNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
  color?: string;
}

interface CanvasConnection {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
}

interface SystemDesignCanvasProps {
  readOnly?: boolean;
  onSave?: (nodes: CanvasNode[], connections: CanvasConnection[]) => void;
  initialNodes?: CanvasNode[];
  initialConnections?: CanvasConnection[];
}

export function SystemDesignCanvas({
  readOnly = false,
  onSave,
  initialNodes = [],
  initialConnections = [],
}: SystemDesignCanvasProps) {
  const [nodes, setNodes] = useState<CanvasNode[]>(
    initialNodes.length > 0
      ? initialNodes
      : [
          { id: "node-1", kind: "gateway", x: 100, y: 180, label: "API Gateway", color: "#3b82f6" },
          { id: "node-2", kind: "server", x: 340, y: 180, label: "Auth Service", color: "#10b981" },
          { id: "node-3", kind: "database", x: 580, y: 180, label: "Primary Postgres", color: "#8b5cf6" },
        ]
  );
  const [connections, setConnections] = useState<CanvasConnection[]>(
    initialConnections.length > 0
      ? initialConnections
      : [
          { id: "conn-1", fromId: "node-1", toId: "node-2", label: "gRPC" },
          { id: "conn-2", fromId: "node-2", toId: "node-3", label: "SQL / Pool" },
        ]
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleAddNode = (kind: NodeKind) => {
    if (readOnly) return;
    const labels: Record<NodeKind, string> = {
      rectangle: "Component",
      circle: "Cache / Redis",
      text: "Note / Description",
      database: "Database",
      server: "Microservice",
      cloud: "Cloud Provider",
      gateway: "API Gateway",
    };
    const colors: Record<NodeKind, string> = {
      rectangle: "#3b82f6",
      circle: "#ec4899",
      text: "#9ca3af",
      database: "#8b5cf6",
      server: "#10b981",
      cloud: "#06b6d4",
      gateway: "#f59e0b",
    };
    const newNode: CanvasNode = {
      id: `node-${Date.now()}`,
      kind,
      x: 150 + Math.random() * 80,
      y: 120 + Math.random() * 80,
      label: labels[kind],
      color: colors[kind],
    };
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (readOnly) return;
    e.stopPropagation();
    if (connectFromId && connectFromId !== id) {
      // Complete connection
      const newConn: CanvasConnection = {
        id: `conn-${Date.now()}`,
        fromId: connectFromId,
        toId: id,
      };
      setConnections((prev) => [...prev, newConn]);
      setConnectFromId(null);
      return;
    }

    setSelectedNodeId(id);
    setDraggingNodeId(id);
    const node = nodes.find((n) => n.id === id);
    if (node) {
      dragOffset.current = { x: e.clientX - node.x, y: e.clientY - node.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingNodeId || readOnly) return;
    const nextX = Math.max(20, e.clientX - dragOffset.current.x);
    const nextY = Math.max(20, e.clientY - dragOffset.current.y);

    setNodes((prev) =>
      prev.map((n) => (n.id === draggingNodeId ? { ...n, x: nextX, y: nextY } : n))
    );
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
  };

  const handleDeleteSelected = () => {
    if (!selectedNodeId || readOnly) return;
    setNodes((prev) => prev.filter((n) => n.id !== selectedNodeId));
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== selectedNodeId && c.toId !== selectedNodeId)
    );
    setSelectedNodeId(null);
  };

  const renderIcon = (kind: NodeKind) => {
    switch (kind) {
      case "database":
        return <Database className="w-5 h-5" />;
      case "server":
        return <Server className="w-5 h-5" />;
      case "cloud":
        return <Cloud className="w-5 h-5" />;
      case "gateway":
        return <Globe className="w-5 h-5" />;
      case "circle":
        return <Cpu className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  useEffect(() => {
    if (onSave) {
      onSave(nodes, connections);
    }
  }, [nodes, connections, onSave]);

  return (
    <div className="flex flex-col w-full h-[540px] bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden text-zinc-100 font-sans">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" /> System Design Architecture Canvas
          </span>
          {!readOnly && (
            <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => handleAddNode("gateway")}
                className="px-2.5 py-1 text-xs font-medium rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5"
                title="Add API Gateway"
              >
                <Globe className="w-3.5 h-3.5 text-amber-400" /> Gateway
              </button>
              <button
                onClick={() => handleAddNode("server")}
                className="px-2.5 py-1 text-xs font-medium rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5"
                title="Add Service"
              >
                <Server className="w-3.5 h-3.5 text-emerald-400" /> Service
              </button>
              <button
                onClick={() => handleAddNode("database")}
                className="px-2.5 py-1 text-xs font-medium rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5"
                title="Add Database"
              >
                <Database className="w-3.5 h-3.5 text-purple-400" /> Database
              </button>
              <button
                onClick={() => handleAddNode("circle")}
                className="px-2.5 py-1 text-xs font-medium rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center gap-1.5"
                title="Add Cache"
              >
                <Cpu className="w-3.5 h-3.5 text-pink-400" /> Cache
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {connectFromId ? (
            <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 animate-pulse">
              Click target component to connect...
            </span>
          ) : (
            !readOnly && (
              <button
                disabled={!selectedNodeId}
                onClick={() => setConnectFromId(selectedNodeId)}
                className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 transition ${
                  selectedNodeId
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" /> Connect Line
              </button>
            )
          )}
          {!readOnly && (
            <button
              disabled={!selectedNodeId}
              onClick={handleDeleteSelected}
              className="p-1.5 text-xs rounded bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 transition"
              title="Delete Selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => {
          setSelectedNodeId(null);
          setConnectFromId(null);
        }}
        className="relative flex-1 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] bg-zinc-950 overflow-hidden cursor-crosshair"
      >
        {/* Connection SVG Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {connections.map((conn) => {
            const fromNode = nodes.find((n) => n.id === conn.fromId);
            const toNode = nodes.find((n) => n.id === conn.toId);
            if (!fromNode || !toNode) return null;

            const fx = fromNode.x + 70;
            const fy = fromNode.y + 35;
            const tx = toNode.x + 70;
            const ty = toNode.y + 35;

            return (
              <g key={conn.id}>
                <line
                  x1={fx}
                  y1={fy}
                  x2={tx}
                  y2={ty}
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  className="animate-[dash_10s_linear_infinite]"
                />
                <circle cx={(fx + tx) / 2} cy={(fy + ty) / 2} r="3" fill="#10b981" />
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => {
          const isSelected = selectedNodeId === node.id;
          const isConnecting = connectFromId === node.id;

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleMouseDown(node.id, e)}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              className={`absolute w-36 py-3 px-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 shadow-xl transition-all select-none ${
                isSelected
                  ? "border-emerald-400 bg-zinc-900 shadow-emerald-500/10 ring-2 ring-emerald-400/20"
                  : "border-zinc-800 bg-zinc-900/90 hover:border-zinc-700"
              } ${isConnecting ? "ring-2 ring-amber-400 border-amber-400" : ""}`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: node.color || "#3b82f6" }}
              >
                {renderIcon(node.kind)}
              </div>
              <input
                type="text"
                disabled={readOnly}
                value={node.label}
                onChange={(e) => {
                  const val = e.target.value;
                  setNodes((prev) =>
                    prev.map((n) => (n.id === node.id ? { ...n, label: val } : n))
                  );
                }}
                className="w-full text-center bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none focus:text-white"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
