"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type SunBand = "all" | "easy" | "medium" | "hard";

/**
 * SUN SCENE — a synthwave half-sun rising on the left over a horizon grid,
 * purpose-built for the Questionverse hero (replaces the galaxy look).
 * Same perf contract as our other scenes: unlit materials only, self-owned
 * animation time (freeze/resume seamless), mouse-reactive rig, paused
 * offscreen / on scroll / on reduced motion.
 *
 * `accent` tints the corona + embers (driven by the difficulty tuner);
 * the solar core always stays amber.
 */
function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

/** Slatted solar disc texture (classic synthwave slits, thicker downward). */
function useSunTexture() {
  return useMemo(() => {
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "#fffbeF");
    g.addColorStop(0.35, "#ffe9a8");
    g.addColorStop(0.62, "#ffb64d");
    g.addColorStop(0.85, "#ff7b2e");
    g.addColorStop(1, "rgba(255,123,46,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // slits — destination-out cuts, growing toward the bottom
    ctx.globalCompositeOperation = "destination-out";
    let y = S * 0.52;
    let h = 3;
    while (y < S) {
      ctx.fillRect(0, y, S, h);
      y += h + 14;
      h += 2.5;
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Soft halo texture (plain radial, no slits). */
function useGlowTexture() {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,190,90,0.85)");
    g.addColorStop(0.45, "rgba(255,123,46,0.35)");
    g.addColorStop(1, "rgba(255,123,46,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** The sun group — half-dipped below the horizon, gentle breathing pulse. */
function Sun({ accent }: { accent: string }) {
  const ref = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const time = useRef(0);
  const sunTex = useSunTexture();
  const glowTex = useGlowTexture();
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    if (ref.current) {
      const s = 1 + Math.sin(t * 0.8) * 0.015;
      ref.current.scale.setScalar(s);
    }
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.55 + Math.sin(t * 0.8) * 0.08;
    }
  });
  if (!sunTex || !glowTex) return null;
  return (
    // low + left: the disc sits half under the horizon grid = half sun
    <group ref={ref} position={[-3.6, -1.7, -2.5]}>
      <sprite ref={glowRef} scale={[11, 11, 1]}>
        <spriteMaterial map={glowTex} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <mesh>
        <planeGeometry args={[5.4, 5.4]} />
        <meshBasicMaterial map={sunTex} transparent depthWrite={false} />
      </mesh>
      {/* corona ring picks up the tuned accent */}
      <mesh rotation={[0.2, 0.1, 0]}>
        <torusGeometry args={[3.35, 0.02, 8, 140]} />
        <meshBasicMaterial color={accent} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

/** Radiating corona ticks, slow rotation. */
function Corona({ accent }: { accent: string }) {
  const ref = useRef<THREE.LineSegments>(null);
  const time = useRef(0);
  const geometry = useMemo(() => {
    const pts: number[] = [];
    const N = 72;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r0 = 3.65;
      const r1 = r0 + (i % 2 === 0 ? 0.35 : 0.18);
      pts.push(Math.cos(a) * r0, Math.sin(a) * r0, 0, Math.cos(a) * r1, Math.sin(a) * r1, 0);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, []);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    ref.current.rotation.z = stepTime(time, rawDelta) * 0.05;
  });
  return (
    <lineSegments ref={ref} geometry={geometry} position={[-3.6, -1.7, -2.5]}>
      <lineBasicMaterial color={accent} transparent opacity={0.55} />
    </lineSegments>
  );
}

/** Embers rising off the horizon — CPU-cheap loop over 150 points. */
function Embers({ accent }: { accent: string }) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  const { positions, seeds } = useMemo(() => {
    const N = 150;
    const positions = new Float32Array(N * 3);
    const seeds = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      positions[i * 3] = -3.6 + (Math.random() - 0.5) * 11;
      positions[i * 3 + 1] = -2.2 + Math.random() * 7;
      positions[i * 3 + 2] = -2.5 + (Math.random() - 0.5) * 6;
      seeds[i * 2] = Math.random();
      seeds[i * 2 + 1] = 0.25 + Math.random() * 0.6;
    }
    return { positions, seeds };
  }, []);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const t = stepTime(time, rawDelta);
    const attr = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < seeds.length / 2; i++) {
      const span = 7;
      const y = -2.2 + (((seeds[i * 2] * span + t * seeds[i * 2 + 1]) % span + span) % span);
      arr[i * 3 + 1] = y;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.06} color={accent} transparent opacity={0.7} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Whole-scene mouse parallax rig. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.08;
    ref.current.rotation.x = -state.pointer.y * 0.05;
  });
  return <group ref={ref}>{children}</group>;
}

export default function SunScene3D({ paused = false, accent = "#ffb64d" }: { paused?: boolean; accent?: string }) {
  return (
    <Canvas
      camera={{ position: [0, 0.7, 9.5], fov: 42 }}
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      performance={{ min: 0.5 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <fog attach="fog" args={["#07070e", 12, 30]} />
      <Rig>
        <Sun accent={accent} />
        <Corona accent={accent} />
        <Embers accent={accent} />
        <gridHelper args={[36, 46, "#8b93ff", "#2c2660"]} position={[0, -2.2, -2]} material-transparent material-opacity={0.32} />
      </Rig>
    </Canvas>
  );
}
