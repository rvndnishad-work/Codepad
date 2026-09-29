"use client";

import { useMemo, useRef, type ComponentRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";

/**
 * The theory-round interviewer as a living 3D orb. It breathes when idle,
 * ripples with a speech-like rhythm while the interviewer talks, swells with
 * the candidate's microphone level while listening, and churns while
 * thinking. Loaded on demand (three.js stays out of the page bundle); the CSS
 * orb stands in on phones, with reduced motion, or without WebGL.
 */

export type OrbState = "idle" | "speaking" | "listening" | "thinking";

/** A theme colour from its "r g b" custom property. */
function themeColor(name: string, fallback: string): THREE.Color {
  const raw = typeof window === "undefined" ? "" : getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  return parts.length === 3 && parts.every(Number.isFinite) ? new THREE.Color(`rgb(${parts.join(",")})`) : new THREE.Color(fallback);
}

function Orb({ state, levelRef, main, soft, accent }: { state: OrbState; levelRef: MutableRefObject<number>; main: THREE.Color; soft: THREE.Color; accent: THREE.Color }) {
  const core = useRef<THREE.Mesh>(null);
  const mat = useRef<ComponentRef<typeof MeshDistortMaterial>>(null);
  const shell = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const cur = useRef({ scale: 1, distort: 0.22, ring: 0 });

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    // Speech has no level we can read, so give it a syllable-like rhythm.
    const level =
      state === "listening" ? Math.min(1, levelRef.current * 1.4) : state === "speaking" ? 0.3 + 0.35 * Math.abs(Math.sin(t * 7.1) * Math.sin(t * 2.9)) : 0;
    const target = {
      scale: 1 + level * 0.18 + (state === "idle" ? Math.sin(t * 1.4) * 0.025 : 0),
      distort: state === "thinking" ? 0.5 : 0.2 + level * 0.4,
      ring: state === "listening" ? 1 : 0,
    };
    const k = 1 - Math.exp(-dt * 7);
    const c = cur.current;
    c.scale += (target.scale - c.scale) * k;
    c.distort += (target.distort - c.distort) * k;
    c.ring += (target.ring - c.ring) * k;

    core.current?.scale.setScalar(c.scale);
    if (core.current) core.current.rotation.y += dt * (state === "thinking" ? 1.1 : 0.2);
    if (mat.current) {
      mat.current.distort = c.distort;
    }
    if (shell.current) {
      shell.current.rotation.x += dt * 0.06;
      shell.current.rotation.y -= dt * (state === "thinking" ? 0.5 : 0.1);
    }
    if (ring.current && ringMat.current) {
      ring.current.scale.setScalar(1 + level * 0.25);
      ring.current.rotation.z += dt * 0.4;
      ringMat.current.opacity = c.ring * (0.45 + level * 0.5);
    }
  });

  return (
    <>
      <mesh ref={core}>
        <icosahedronGeometry args={[1, 48]} />
        <MeshDistortMaterial ref={mat} color={main} emissive={soft} emissiveIntensity={0.18} roughness={0.28} metalness={0.15} distort={0.22} speed={2} />
      </mesh>
      <mesh ref={shell} scale={1.42}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial color={soft} wireframe transparent opacity={0.1} />
      </mesh>
      <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.3, 0.014, 12, 160]} />
        <meshBasicMaterial ref={ringMat} color={accent} transparent opacity={0} />
      </mesh>
    </>
  );
}

export default function InterviewerOrb3D({ state, levelRef }: { state: OrbState; levelRef: MutableRefObject<number> }) {
  const colors = useMemo(
    () => ({ main: themeColor("--c-accent-2", "#3f39c9"), soft: themeColor("--c-accent-2-soft", "#6366f1"), accent: themeColor("--c-accent", "#ce362e") }),
    [],
  );
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.2], fov: 40 }} gl={{ antialias: true, alpha: true }} aria-hidden>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} />
      <pointLight position={[-4, -2, 2]} intensity={18} color={colors.soft} />
      <Orb state={state} levelRef={levelRef} {...colors} />
    </Canvas>
  );
}
