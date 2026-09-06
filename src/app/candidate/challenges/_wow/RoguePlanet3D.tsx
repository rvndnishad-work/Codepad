"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/**
 * ROGUE PLANET — a starless drifter for the challenges hero: dark cratered
 * world with faint settlement speckles on its night side, a frosty rim,
 * two moonlets and drifting ice crystals. No sun, so the planet hangs dim
 * with a cold violet aura. Same perf contract as our other scenes: unlit
 * materials only, self-owned animation time, mouse-reactive rig, paused
 * offscreen / on scroll / on reduced motion.
 */
function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

/** Dark basalt + craters + night-side settlement speckles. */
function useRogueTexture() {
  return useMemo(() => {
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S * 2; // equirect-ish 2:1
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const H = S * 2;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#141a30");
    g.addColorStop(0.5, "#0d1124");
    g.addColorStop(1, "#080a18");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, H);
    // craters: dark bowls with pale rims
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * S;
      const y = Math.random() * H;
      const r = 3 + Math.random() * 16;
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(160,190,255,0.28)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x, y, r, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    // settlement speckles — tiny warm lights clustered on the night side
    for (let c = 0; c < 7; c++) {
      const cx = Math.random() * S;
      const cy = Math.random() * H;
      for (let i = 0; i < 26; i++) {
        const x = cx + (Math.random() - 0.5) * 46;
        const y = cy + (Math.random() - 0.5) * 30;
        ctx.fillStyle = Math.random() > 0.3 ? "rgba(255,200,120,0.9)" : "rgba(140,200,255,0.9)";
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function useAuraTexture() {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0.55, "rgba(139,147,255,0)");
    g.addColorStop(0.72, "rgba(139,147,255,0.35)");
    g.addColorStop(0.85, "rgba(160,200,255,0.18)");
    g.addColorStop(1, "rgba(160,200,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** The drifter itself — slow spin, gentle hover. */
function RogueWorld({ map, aura }: { map: THREE.Texture | null; aura: THREE.Texture | null }) {
  const ref = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    if (!ref.current) return;
    ref.current.rotation.y = t * 0.06;
    ref.current.position.y = -0.9 + Math.sin(t * 0.4) * 0.1;
  });
  if (!map || !aura) return null;
  return (
    <group ref={ref} position={[1.6, -0.9, -1.2]}>
      <sprite scale={[7.6, 7.6, 1]}>
        <spriteMaterial map={aura} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh>
        <sphereGeometry args={[1.9, 56, 56]} />
        <meshBasicMaterial map={map} />
      </mesh>
      {/* frost rim */}
      <mesh>
        <sphereGeometry args={[1.94, 56, 56]} />
        <meshBasicMaterial color="#9fc4ff" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Two moonlets on tilted orbits. */
function Moonlets() {
  const group = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!group.current) return;
    group.current.rotation.z = stepTime(time, rawDelta) * 0.07;
    group.current.rotation.y = time.current * 0.03;
  });
  return (
    <group ref={group} position={[1.6, -0.9, -1.2]} rotation={[0.5, 0, 0.25]}>
      {[
        { r: 2.9, size: 0.16, speed: 1, color: "#aebadd" },
        { r: 3.5, size: 0.1, speed: -0.7, color: "#7f8bb0" },
      ].map((m, i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 1.3]}>
          <mesh position={[m.r, 0, 0]}>
            <sphereGeometry args={[m.size, 16, 16]} />
            <meshBasicMaterial color={m.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Drifting ice crystals catching stray light. */
function Drift({ count = 160 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return arr;
  }, [count]);
  useFrame((state, rawDelta) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.12 + stepTime(time, rawDelta) * 0.008;
    ref.current.rotation.x = -state.pointer.y * 0.08;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#bcd6ff" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export default function RoguePlanet3D({ paused = false }: { paused?: boolean }) {
  const map = useRogueTexture();
  const aura = useAuraTexture();
  return (
    <Canvas
      camera={{ position: [0, 0.4, 9.5], fov: 44 }}
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      performance={{ min: 0.5 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Stars radius={60} depth={40} count={800} factor={2.4} saturation={0.2} fade speed={0.3} />
      <RogueWorld map={map} aura={aura} />
      <Moonlets />
      <Drift />
    </Canvas>
  );
}
