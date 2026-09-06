"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * ORBIT SCENE — a small accent-tinted orbital sculpture for the question
 * detail hero (nucleus + three electron rings + drifting dust). Distinct
 * from the galaxy / vault / sun / black-hole scenes. Same perf contract:
 * unlit materials only, self-owned animation time, mouse-reactive rig,
 * paused offscreen / on scroll / on reduced motion.
 *
 * NOTE: `accent` must be a real color — theme hexes that fall back to
 * `var(--accent)` are sanitized to indigo since THREE can't resolve CSS vars.
 */
function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

function Nucleus({ accent }: { accent: string }) {
  const ref = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const t = stepTime(time, rawDelta);
    ref.current.rotation.y = t * 0.25;
    ref.current.rotation.x = Math.sin(t * 0.3) * 0.2;
  });
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshBasicMaterial color="#0b0b16" transparent opacity={0.94} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.5, 1]} />
        <meshBasicMaterial color={accent} wireframe transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/** One tilted ring with electrons riding it. */
function ElectronRing({
  radius,
  tilt,
  speed,
  accent,
  electrons = 2,
  phase = 0,
}: {
  radius: number;
  tilt: [number, number, number];
  speed: number;
  accent: string;
  electrons?: number;
  phase?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  const dots = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    if (group.current) group.current.rotation.z = t * speed * 0.25;
    for (let i = 0; i < electrons; i++) {
      const m = dots.current[i];
      if (!m) continue;
      const a = t * speed + phase + (i / electrons) * Math.PI * 2;
      m.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }
  });
  return (
    <group rotation={tilt}>
      <mesh ref={group}>
        <torusGeometry args={[radius, 0.012, 8, 120]} />
        <meshBasicMaterial color={accent} transparent opacity={0.4} />
      </mesh>
      {Array.from({ length: electrons }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            dots.current[i] = el;
          }}
        >
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
        </mesh>
      ))}
    </group>
  );
}

/** Faint dust field for depth. */
function Dust({ accent }: { accent: string }) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  const positions = useMemo(() => {
    const arr = new Float32Array(130 * 3);
    for (let i = 0; i < 130; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 7;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);
  useFrame((state, rawDelta) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.1 + stepTime(time, rawDelta) * 0.012;
    ref.current.rotation.x = -state.pointer.y * 0.08;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={accent} transparent opacity={0.45} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.12;
    ref.current.rotation.x = -state.pointer.y * 0.08;
  });
  return <group ref={ref}>{children}</group>;
}

export default function OrbitScene3D({ paused = false, hex = "#8b93ff" }: { paused?: boolean; hex?: string }) {
  const accent = hex.startsWith("#") ? hex : "#8b93ff";
  return (
    <Canvas
      camera={{ position: [0, 0.4, 7.5], fov: 42 }}
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      performance={{ min: 0.5 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Rig>
        <Dust accent={accent} />
        <Nucleus accent={accent} />
        <ElectronRing radius={1.05} tilt={[0.5, 0.2, 0]} speed={0.9} accent={accent} electrons={2} />
        <ElectronRing radius={1.55} tilt={[-0.4, 0.5, 0.3]} speed={-0.6} accent={accent} electrons={2} phase={1.4} />
        <ElectronRing radius={2.05} tilt={[0.9, -0.3, -0.2]} speed={0.4} accent={accent} electrons={3} phase={2.6} />
      </Rig>
    </Canvas>
  );
}
