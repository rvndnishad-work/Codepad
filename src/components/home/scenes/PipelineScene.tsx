"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * "How grading works" scene: code (left panel) streams as particles into the
 * sealed sandbox cube (the isolated runner), and comes out the other side as
 * test results - a grid of cells flipping green. Mirrors the real
 * architecture: editor -> isolated runner -> server-graded verdict.
 *
 * Perf notes: one InstancedMesh for the particles, one for the test grid,
 * simple materials, DPR clamped by the Canvas props. Total draw calls ~10.
 */

/** Read a CSS custom property so the scene follows the active theme. */
function cssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const PARTICLES = 70;
const GRID_COLS = 4;
const GRID_ROWS = 3;
const PATH_START = -4.4;
const PATH_END = 2.6;

// Module-scope scratch objects for the per-frame instancing math. useFrame
// callbacks run serially on the rAF thread, so sharing these is safe and
// avoids per-frame allocation (and mutation of memoized values, which the
// react-hooks immutability lint rightly rejects).
const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();
const GREEN = new THREE.Color("#34d399");
const IDLE = new THREE.Color("#475569");

/** Deterministic PRNG (mulberry32) so per-particle scatter is stable across
 *  renders and never calls Math.random during a React render. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Generated once at module load — not during render.
const SEEDS = (() => {
  const rand = mulberry32(20260610);
  return Array.from({ length: PARTICLES }, () => ({
    offset: rand(),
    lane: (rand() - 0.5) * 1.1,
    depth: (rand() - 0.5) * 0.7,
    speed: 0.085 + rand() * 0.05,
  }));
})();

function Particles({ accent }: { accent: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const seeds = SEEDS;

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    seeds.forEach((s, i) => {
      const p = (s.offset + t * s.speed) % 1;
      const x = PATH_START + p * (PATH_END - PATH_START);
      // Converge into the cube center (x near 0), fan back out after.
      const squeeze = Math.min(1, Math.abs(x) / 1.4);
      const y = s.lane * squeeze;
      const z = s.depth * squeeze;
      // Shrink while "inside" the cube so the stream reads as absorbed/emitted.
      const inside = Math.abs(x) < 0.85 ? 0.45 : 1;
      scratch.position.set(x, y, z);
      scratch.scale.setScalar(0.05 * inside);
      scratch.updateMatrix();
      mesh.current!.setMatrixAt(i, scratch.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLES]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={accent} transparent opacity={0.9} />
    </instancedMesh>
  );
}

function SandboxCube({ accent }: { accent: string }) {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (outer.current) {
      outer.current.rotation.y = t * 0.35;
      outer.current.rotation.x = Math.sin(t * 0.4) * 0.18;
    }
    if (inner.current) {
      inner.current.rotation.y = -t * 0.5;
      const pulse = 1 + Math.sin(t * 2.2) * 0.04;
      inner.current.scale.setScalar(pulse);
    }
  });
  return (
    <group>
      <mesh ref={outer}>
        <boxGeometry args={[1.7, 1.7, 1.7]} />
        <meshBasicMaterial color={accent} wireframe transparent opacity={0.55} />
      </mesh>
      <mesh ref={inner}>
        <boxGeometry args={[1.0, 1.0, 1.0]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.35}
          transparent
          opacity={0.28}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

/** Left: stylized code panel - a frame with floating "lines of code". */
function CodePanel() {
  const group = useRef<THREE.Group>(null);
  const lines = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({ y: 0.62 - i * 0.25, w: 0.5 + ((i * 37) % 50) / 100 })),
    []
  );
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = Math.sin(clock.getElapsedTime() * 0.8) * 0.06;
  });
  return (
    <group ref={group} position={[-4.6, 0, 0]} rotation={[0, 0.5, 0]}>
      <mesh>
        <planeGeometry args={[2.0, 2.1]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      {lines.map((l, i) => (
        <mesh key={i} position={[-(2.0 - l.w * 1.5) / 2 + 0.15, l.y, 0.01]}>
          <planeGeometry args={[l.w * 1.5, 0.09]} />
          <meshBasicMaterial color="#64748b" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Right: test-result grid - cells flip to green in a rolling wave. */
function TestGrid() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = GRID_COLS * GRID_ROWS;

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      // 6-second cycle: each cell passes, holds green, then resets.
      const phase = ((t * 0.9 - i * 0.35) % 6 + 6) % 6;
      const lit = phase > 0 && phase < 4 ? Math.min(1, phase / 0.5) : 0;
      scratchColor.copy(IDLE).lerp(GREEN, lit);
      mesh.current.setColorAt(i, scratchColor);
      scratch.position.set(3.5 + col * 0.55, 0.75 - row * 0.55, 0);
      scratch.rotation.y = 0.45 + (1 - lit) * 0.5;
      scratch.scale.setScalar(0.21 + lit * 0.04);
      scratch.updateMatrix();
      mesh.current.setMatrixAt(i, scratch.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 0.3]} />
      <meshStandardMaterial roughness={0.35} />
    </instancedMesh>
  );
}

export default function PipelineScene() {
  const accent = cssColor("--accent", "#FFE600");
  return (
    <Canvas
      className="!absolute !inset-0"
      camera={{ position: [0, 0.4, 7.5], fov: 38 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} />
      <CodePanel />
      <SandboxCube accent={accent} />
      <TestGrid />
      <Particles accent={accent} />
    </Canvas>
  );
}
