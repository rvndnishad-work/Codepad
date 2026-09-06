"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/**
 * COLLIDING PLANETS — icy world (left) grinding into a lava world (right)
 * for the candidate interview hero: nerves vs. heat. Contact flash,
 * shockwave rings and impact sparks sell the collision; both bodies breathe
 * toward/away from each other in a slow tension loop. Same perf contract as
 * our other scenes: unlit materials only, self-owned animation time,
 * mouse-reactive rig, paused offscreen / on scroll / on reduced motion.
 */
function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

/** Pale fractured ice texture. */
function useIceTexture() {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.45, "#d5ecff");
    g.addColorStop(0.8, "#8fc3f2");
    g.addColorStop(1, "#5d9fe8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // frost blotches
    for (let i = 0; i < 46; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 4 + Math.random() * 18;
      const b = ctx.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, "rgba(255,255,255,0.5)");
      b.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // crevasse cracks
    ctx.strokeStyle = "rgba(70,130,200,0.55)";
    for (let i = 0; i < 14; i++) {
      ctx.lineWidth = 0.8 + Math.random() * 1.4;
      ctx.beginPath();
      let x = Math.random() * S;
      let y = Math.random() * S;
      ctx.moveTo(x, y);
      for (let s = 0; s < 5; s++) {
        x += (Math.random() - 0.5) * 60;
        y += (Math.random() - 0.5) * 60;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Basalt crust with glowing lava cracks. */
function useLavaTexture() {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#230b06";
    ctx.fillRect(0, 0, S, S);
    // cooling blotches
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * S;
      const y = Math.random() * S;
      const r = 6 + Math.random() * 22;
      const b = ctx.createRadialGradient(x, y, 0, x, y, r);
      b.addColorStop(0, "rgba(150,45,18,0.8)");
      b.addColorStop(1, "rgba(150,45,18,0)");
      ctx.fillStyle = b;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // glowing cracks (wide orange under, thin yellow core)
    for (let i = 0; i < 22; i++) {
      for (const [w, c] of [[5, "rgba(255,110,40,0.9)"], [2, "rgba(255,205,120,0.95)"]] as const) {
        ctx.strokeStyle = c;
        ctx.lineWidth = w;
        ctx.beginPath();
        let x = Math.random() * S;
        let y = Math.random() * S;
        ctx.moveTo(x, y);
        for (let s = 0; s < 6; s++) {
          x += (Math.random() - 0.5) * 70;
          y += (Math.random() - 0.5) * 70;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function useGlowTexture(stops: [number, string][]) {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    for (const [o, c] of stops) g.addColorStop(o, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [stops]);
}

/** One planet: textured sphere + atmosphere halo + slow spin + tension bob. */
function Planet({
  position,
  radius,
  map,
  glowTex,
  glowColor,
  spin = 0.1,
  bobPhase = 0,
}: {
  position: [number, number, number];
  radius: number;
  map: THREE.Texture | null;
  glowTex: THREE.Texture | null;
  glowColor: string;
  spin?: number;
  bobPhase?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    if (mesh.current) mesh.current.rotation.y = t * spin;
    if (group.current) {
      // lean into the collision, then ease back — the tension loop
      group.current.position.x = position[0] + Math.sin(t * 0.35 + bobPhase) * 0.14;
      group.current.position.y = position[1] + Math.sin(t * 0.5 + bobPhase) * 0.06;
    }
  });
  if (!map || !glowTex) return null;
  return (
    <group ref={group} position={position}>
      <sprite scale={[radius * 3.4, radius * 3.4, 1]}>
        <spriteMaterial map={glowTex} color={glowColor} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh ref={mesh}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial map={map} />
      </mesh>
    </group>
  );
}

/** The impact flash at the contact point — breathing white-hot glare. */
function ImpactFlash() {
  const ref = useRef<THREE.Sprite>(null);
  const time = useRef(0);
  const tex = useGlowTexture([
    [0, "rgba(255,250,235,1)"],
    [0.3, "rgba(255,200,120,0.55)"],
    [1, "rgba(255,150,60,0)"],
  ]);
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    if (ref.current) {
      const m = ref.current.material as THREE.SpriteMaterial;
      m.opacity = 0.65 + Math.sin(t * 1.4) * 0.15;
      const s = 3.4 + Math.sin(t * 1.4) * 0.25;
      ref.current.scale.set(s, s, 1);
    }
  });
  if (!tex) return null;
  return (
    <sprite ref={ref} position={[0, -0.9, -0.6]}>
      <spriteMaterial map={tex} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}

/** Expanding shockwave rings, looping. */
function Shockwaves() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    for (let i = 0; i < 2; i++) {
      const m = refs.current[i];
      if (!m) continue;
      const phase = ((t * 0.35 + i * 0.5) % 1 + 1) % 1;
      const s = 1 + phase * 2.6;
      m.scale.set(s, s, 1);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 * (1 - phase);
    }
  });
  return (
    <group position={[0, -0.9, -0.9]}>
      {[0, 1].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <ringGeometry args={[1.15, 1.22, 96]} />
          <meshBasicMaterial color={i === 0 ? "#ffd9a0" : "#8b93ff"} transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  );
}

/** Sparks blasted outward from the contact point. */
function Sparks({ count = 130 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  const seeds = useMemo(() => {
    const arr = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      arr[i * 4] = Math.random() * Math.PI * 2; // direction
      arr[i * 4 + 1] = 0.3 + Math.random() * 1.6; // speed
      arr[i * 4 + 2] = Math.random(); // offset
      arr[i * 4 + 3] = (Math.random() - 0.5) * 1.6; // z spread
    }
    return arr;
  }, [count]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    stepTime(time, rawDelta);
    const attr = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const span = 3.4;
      const d = ((seeds[i * 4 + 2] * span + time.current * seeds[i * 4 + 1]) % span + span) % span;
      const a = seeds[i * 4];
      arr[i * 3] = Math.cos(a) * d;
      arr[i * 3 + 1] = -0.9 + Math.sin(a) * d * 0.7;
      arr[i * 3 + 2] = -0.6 + seeds[i * 4 + 3];
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} color="#ffc37a" transparent opacity={0.85} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.07;
    ref.current.rotation.x = -state.pointer.y * 0.04;
  });
  return <group ref={ref}>{children}</group>;
}

export default function CollidingPlanets3D({ paused = false }: { paused?: boolean }) {
  const iceTex = useIceTexture();
  const lavaTex = useLavaTexture();
  const iceGlow = useGlowTexture([
    [0, "rgba(170,215,255,0.7)"],
    [0.5, "rgba(120,180,255,0.25)"],
    [1, "rgba(120,180,255,0)"],
  ]);
  const lavaGlow = useGlowTexture([
    [0, "rgba(255,140,60,0.75)"],
    [0.5, "rgba(255,90,40,0.28)"],
    [1, "rgba(255,90,40,0)"],
  ]);
  return (
    <Canvas
      camera={{ position: [0, 0.4, 9.5], fov: 45 }}
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      performance={{ min: 0.5 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Stars radius={60} depth={40} count={700} factor={2.6} saturation={0.25} fade speed={0.35} />
      <Rig>
        {/* icy world (left) vs lava world (right), grinding at center-low */}
        <Planet position={[-1.85, -0.7, -0.8]} radius={1.2} map={iceTex} glowTex={iceGlow} glowColor="#9fd0ff" spin={0.08} bobPhase={0} />
        <Planet position={[1.85, -0.7, -0.8]} radius={1.05} map={lavaTex} glowTex={lavaGlow} glowColor="#ff8a3d" spin={-0.11} bobPhase={Math.PI} />
        <ImpactFlash />
        <Shockwaves />
        <Sparks />
      </Rig>
    </Canvas>
  );
}
