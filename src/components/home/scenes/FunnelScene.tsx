"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Recruiter hero scene: the hiring funnel. Candidate particles stream through
 * five narrowing stage rings (Applied → Screened → Take-home → Onsite → Offer);
 * some drop out and fall away red, the rest exit the last ring and turn
 * emerald (hired). It is a literal render of the platform's pipeline model.
 *
 * One InstancedMesh for candidates + five torus meshes — cheap to draw.
 */

const COUNT = 110;
const STAGES = [-4.2, -2.1, 0, 2.1, 4.2];
const RADII = [1.55, 1.25, 0.98, 0.74, 0.55];
const X_ENTER = -6.2;
const X_EXIT = 6.4;

// Module-scope scratch objects: useFrame runs serially on the rAF thread, so
// sharing these avoids per-frame allocation and mutation of memoized values.
const scratch = new THREE.Object3D();
const scratchColor = new THREE.Color();

/** Deterministic PRNG (mulberry32) — stable scatter, no Math.random in render. */
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
const SEEDS: Seed[] = (() => {
  const rand = mulberry32(34);
  return Array.from({ length: COUNT }, () => ({
    offset: rand(),
    speed: 0.05 + rand() * 0.03,
    angle: rand() * Math.PI * 2,
    wobble: 0.5 + rand() * 0.5,
    // Roughly half convert all the way — funnel realism without gloom.
    dropStage: rand() < 0.55 ? 99 : Math.floor(rand() * 4),
  }));
})();

type Seed = {
  offset: number;
  speed: number;
  angle: number;
  wobble: number;
  /** Stage index at which this candidate drops out; 99 = makes it through. */
  dropStage: number;
};

function Candidates({ indigo, emerald, rose }: { indigo: string; emerald: string; rose: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const cIndigo = useMemo(() => new THREE.Color(indigo), [indigo]);
  const cEmerald = useMemo(() => new THREE.Color(emerald), [emerald]);
  const cRose = useMemo(() => new THREE.Color(rose), [rose]);

  const seeds = SEEDS;

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.getElapsedTime();
    seeds.forEach((s, i) => {
      const p = (s.offset + t * s.speed) % 1;
      const x = X_ENTER + p * (X_EXIT - X_ENTER);

      // Funnel envelope: radius shrinks as candidates advance.
      let seg = 0;
      while (seg < STAGES.length - 1 && x > STAGES[seg + 1]) seg++;
      const segStart = x < STAGES[0] ? X_ENTER : STAGES[seg];
      const segEnd = x < STAGES[0] ? STAGES[0] : STAGES[Math.min(seg + 1, STAGES.length - 1)];
      const segP = segEnd === segStart ? 1 : THREE.MathUtils.clamp((x - segStart) / (segEnd - segStart), 0, 1);
      const rStart = x < STAGES[0] ? RADII[0] * 1.25 : RADII[seg];
      const rEnd = x < STAGES[0] ? RADII[0] : RADII[Math.min(seg + 1, RADII.length - 1)];
      const radius = THREE.MathUtils.lerp(rStart, rEnd, segP) * 0.82;

      const dropX = s.dropStage < STAGES.length ? STAGES[s.dropStage] : Infinity;
      const dropped = x > dropX;
      const through = x > STAGES[STAGES.length - 1];

      const a = s.angle + t * 0.45 * s.wobble;
      let y = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      let scale = 0.075;

      if (dropped) {
        // Fall away below the funnel, shrinking out.
        const fall = Math.min(1, (x - dropX) / 2.2);
        y -= fall * fall * 3.2;
        scale *= Math.max(0, 1 - fall);
        scratchColor.copy(cRose);
      } else if (through) {
        scratchColor.copy(cEmerald);
        scale = 0.095;
      } else {
        scratchColor.copy(cIndigo);
      }

      scratch.position.set(x, y, z);
      scratch.scale.setScalar(scale);
      scratch.updateMatrix();
      mesh.current!.setMatrixAt(i, scratch.matrix);
      mesh.current!.setColorAt(i, scratchColor);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

function StageRings({ indigo }: { indigo: string }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    group.current.children.forEach((ring, i) => {
      ring.rotation.z = t * (0.12 + i * 0.03) * (i % 2 === 0 ? 1 : -1);
    });
  });
  return (
    <group ref={group}>
      {STAGES.map((x, i) => (
        <mesh key={i} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[RADII[i], 0.035, 10, 48]} />
          <meshStandardMaterial
            color={indigo}
            emissive={indigo}
            emissiveIntensity={0.5}
            transparent
            opacity={0.85}
            roughness={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function FunnelScene() {
  return (
    <Canvas
      className="!absolute !inset-0"
      camera={{ position: [0.6, 1.6, 8.6], fov: 38 }}
      dpr={[1, 1.75]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 6, 6]} intensity={1.0} />
      <StageRings indigo="#6366f1" />
      <Candidates indigo="#818cf8" emerald="#34d399" rose="#fb7185" />
    </Canvas>
  );
}
