"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/**
 * BLACK HOLE SCENE — backdrop for the playgrounds hero. Event-horizon
 * sphere wrapped in a photon ring, a tilted canvas-textured accretion disk
 * (bright inner rim + doppler-boosted flank), a lensed arc swooshing over
 * the top, and matter spiralling inward — all unlit, self-owned animation
 * time (freeze/resume seamless), paused offscreen / on scroll / on
 * reduced motion. No postprocessing: glow is faked with additive sprites.
 */
function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

/** Accretion-disk texture: banded rings, hot inner rim, brighter left flank. */
function useDiskTexture() {
  return useMemo(() => {
    const S = 512;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const cx = S / 2;
    // base falloff: transparent core cutout -> hot rim -> fading tail
    const g = ctx.createRadialGradient(cx, cx, S * 0.18, cx, cx, S * 0.5);
    g.addColorStop(0, "rgba(255,240,210,0.95)");
    g.addColorStop(0.28, "rgba(255,182,77,0.75)");
    g.addColorStop(0.55, "rgba(255,123,46,0.38)");
    g.addColorStop(0.8, "rgba(139,147,255,0.12)");
    g.addColorStop(1, "rgba(139,147,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    // dark lanes between bands
    ctx.globalCompositeOperation = "destination-out";
    for (const [r, w] of [[0.34, 0.02], [0.44, 0.035], [0.62, 0.02]] as const) {
      ctx.beginPath();
      ctx.arc(cx, cx, S * r, 0, Math.PI * 2);
      ctx.lineWidth = S * w;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.stroke();
    }
    // doppler boost: one flank burns brighter
    ctx.globalCompositeOperation = "source-over";
    const d = ctx.createLinearGradient(0, 0, S, 0);
    d.addColorStop(0, "rgba(255,255,255,0.5)");
    d.addColorStop(0.45, "rgba(255,255,255,0)");
    d.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = d;
    ctx.fillRect(0, 0, S, S);
    // punch the core cutout (inside the horizon)
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(cx, cx, S * 0.175, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fill();
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function useGlowTexture() {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,220,160,0.9)");
    g.addColorStop(0.35, "rgba(255,150,60,0.35)");
    g.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** The hole: black sphere + white-hot photon ring + breathing glow. */
function Singularity() {
  const glowRef = useRef<THREE.Sprite>(null);
  const time = useRef(0);
  const glowTex = useGlowTexture();
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    if (glowRef.current) {
      const m = glowRef.current.material as THREE.SpriteMaterial;
      m.opacity = 0.5 + Math.sin(t * 1.1) * 0.07;
    }
  });
  if (!glowTex) return null;
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.5, 48, 48]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* photon ring faces the camera */}
      <mesh>
        <torusGeometry args={[1.58, 0.028, 12, 160]} />
        <meshBasicMaterial color="#fff3dd" transparent opacity={0.95} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <sprite ref={glowRef} scale={[6.5, 6.5, 1]}>
        <spriteMaterial map={glowTex} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Tilted accretion disk, differential-ish spin. */
function AccretionDisk({ texture }: { texture: THREE.Texture | null }) {
  const ref = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    ref.current.rotation.z = stepTime(time, rawDelta) * 0.22;
  });
  if (!texture) return null;
  return (
    <mesh ref={ref} rotation={[-1.25, 0.15, 0]}>
      <ringGeometry args={[1.7, 4.4, 128, 1]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Lensed arc swooshing over the top (the disk's far side bent overhead). */
function LensedArc() {
  const ref = useRef<THREE.Mesh>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const t = stepTime(time, rawDelta);
    ref.current.rotation.z = Math.PI * 0.08 + Math.sin(t * 0.18) * 0.03;
  });
  return (
    <mesh ref={ref} position={[0, 1.15, -0.4]} rotation={[0.25, 0, 0]}>
      <torusGeometry args={[2.35, 0.022, 8, 120, Math.PI * 0.85]} />
      <meshBasicMaterial color="#ffd9a0" transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

/** Matter spiralling inward through the disk plane. */
function Inflow({ count = 220 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const time = useRef(0);
  const seeds = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = Math.random() * Math.PI * 2; // angle
      arr[i * 3 + 1] = 1.9 + Math.random() * 2.4; // radius
      arr[i * 3 + 2] = 0.35 + Math.random() * 0.85; // speed
    }
    return arr;
  }, [count]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    stepTime(time, rawDelta);
    const attr = ref.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    // disk plane tilt baked into positions (matches ~-72° disk tilt)
    const tilt = -1.25;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);
    for (let i = 0; i < count; i++) {
      let a = seeds[i * 3] + time.current * seeds[i * 3 + 2] * 0.55;
      let r = seeds[i * 3 + 1] - time.current * 0.22 * seeds[i * 3 + 2];
      if (r < 1.85) {
        r = 4.2;
        seeds[i * 3] = Math.random() * Math.PI * 2;
        a = seeds[i * 3];
      }
      const x = Math.cos(a) * r;
      const y0 = Math.sin(a) * r;
      arr[i * 3] = x;
      arr[i * 3 + 1] = y0 * cosT;
      arr[i * 3 + 2] = y0 * sinT - 0.4;
    }
    attr.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#ffc37a" transparent opacity={0.8} sizeAttenuation depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/** Whole-scene mouse parallax. */
function Rig({ children }: { children: React.ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.pointer.x * 0.07;
    ref.current.rotation.x = -state.pointer.y * 0.04;
  });
  return <group ref={ref}>{children}</group>;
}

export default function BlackHoleScene3D({ paused = false }: { paused?: boolean }) {
  const diskTex = useDiskTexture();
  return (
    <Canvas
      camera={{ position: [0, 0.4, 9.5], fov: 45 }}
      dpr={[1, 1.5]}
      frameloop={paused ? "never" : "always"}
      performance={{ min: 0.5 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <Stars radius={60} depth={40} count={900} factor={3} saturation={0.3} fade speed={0.4} />
      <Rig>
        {/* sunk low so the disk smolders behind the search/filters, not the headline */}
        <group position={[0, -1.5, -0.8]}>
          <Singularity />
          <AccretionDisk texture={diskTex} />
          <LensedArc />
          <Inflow />
        </group>
      </Rig>
    </Canvas>
  );
}
