"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/**
 * Perf notes (see hero lag report):
 * - No MeshDistortMaterial: it recomputed vertices on the CPU every frame and
 *   got slower the longer the tab stayed open. The core is now a static
 *   wireframe (GPU-transform only) — same look, ~zero per-frame cost.
 * - No lights at all: every material here is unlit (basic/points), so the
 *   three point-lights were pure cost. Deleted.
 * - Cubes pushed to the edges (radius 3.9) and stripped of per-cube spin/bob —
 *   one slow group rotation is all. Keeps them out of the copy column too.
 *
 * Motion runs on SELF-OWNED time (clamped deltas accumulated in refs), never
 * on R3F's shared clock: `setFrameloop` resets `clock.elapsedTime` to 0 on
 * every toggle, which used to snap every object back to its t=0 pose on each
 * scroll start/stop. Owned time freezes while the loop is paused and resumes
 * exactly where it left off — freeze/resume is seamless by construction.
 *
 * `tone` swaps the palette: "arcade" is the neon candidate universe,
 * "boss" is the restrained indigo command-center for hiring teams.
 */
const PALETTES = {
  arcade: {
    core: "#ff2fb3",
    rings: ["#ffe600", "#ff2fb3"],
    cubes: ["#ffe600", "#22d3ee", "#ff2fb3", "#8b93ff", "#34d399"],
    dust: "#ffe600",
  },
  boss: {
    core: "#8b93ff",
    rings: ["#8b93ff", "#22d3ee"],
    cubes: ["#8b93ff", "#6366f1", "#22d3ee", "#a5b4fc", "#e0e7ff"],
    dust: "#a5b4fc",
  },
} as const;

export type VerseTone = keyof typeof PALETTES;

/** Advance owned time by a clamped frame delta. Clamping absorbs the huge
 *  first delta after a freeze so resume never jumps. */
function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

/** Floating distorted core — the "runtime planet". */
function Core({ color }: { color: string }) {
  const ref = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const t = stepTime(time, rawDelta);
    ref.current.rotation.y = t * 0.1;
    ref.current.rotation.x = Math.sin(t * 0.15) * 0.15;
    // Gentle hover bob (replaces drei Float, whose own clock would snap).
    ref.current.position.y = -1.1 + Math.sin(t * 0.7) * 0.18;
  });
  return (
    // sunk low + back so the dense wireframe sits below the headline, not through it
    <group ref={ref} position={[0, -1.1, -1.2]}>
      <mesh>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshBasicMaterial color="#0d0d18" transparent opacity={0.88} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.32} />
      </mesh>
    </group>
  );
}

/** Neon torus ring orbiting the core. */
function Ring({ radius = 2.6, color = "#ffe600", speed = 0.4, tilt = 0.6 }: { radius?: number; color?: string; speed?: number; tilt?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    ref.current.rotation.z = stepTime(time, rawDelta) * speed;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2 - tilt, 0.3, 0]} position={[0, -0.6, -0.6]}>
      <torusGeometry args={[radius, 0.02, 8, 110]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </mesh>
  );
}

/** Code-cube satellites — one slow group orbit, no per-cube animation. */
function Satellites({ colors }: { colors: readonly string[] }) {
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!group.current) return;
    group.current.rotation.y = stepTime(time, rawDelta) * 0.1;
  });
  return (
    <group ref={group} position={[0, -0.3, 0]}>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2;
        return (
          <mesh key={c} position={[Math.cos(a) * 4.1, (i % 2 ? 0.7 : -0.7), Math.sin(a) * 4.1]} rotation={[0.5, a, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshBasicMaterial color={c} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Ambient particle field — mouse-reactive tilt plus a slow owned drift. */
function CometField({ count = 140, color }: { count?: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return arr;
  }, [count]);
  useFrame((state, rawDelta) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.2 + stepTime(time, rawDelta) * 0.015;
    ref.current.rotation.x = -state.pointer.y * 0.15;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color={color} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function CodeVerse3D({ paused = false, tone = "arcade" }: { paused?: boolean; tone?: VerseTone }) {
  const p = PALETTES[tone];
  return (
    <Canvas
      camera={{ position: [0, 0.4, 8.5], fov: 46 }}
      dpr={[1, 1.25]}
      frameloop={paused ? "never" : "always"}
      performance={{ min: 0.5 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      {/* Stars keep R3F's internal clock for twinkle phase; a reset there is a
          subtle shimmer, never a positional snap. */}
      <Stars radius={60} depth={40} count={1200} factor={3.2} saturation={0.4} fade speed={0.5} />
      <CometField color={p.dust} />
      <Core color={p.core} />
      <Ring radius={2.55} color={p.rings[0]} speed={0.25} tilt={0.55} />
      <Ring radius={3.2} color={p.rings[1]} speed={-0.16} tilt={0.9} />
      <Satellites colors={p.cubes} />
    </Canvas>
  );
}
