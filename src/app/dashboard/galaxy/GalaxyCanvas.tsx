"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";

/**
 * True Milky Way backdrop, rebuilt from reference photos — not neon blobs.
 *
 * What makes the real thing read as "Milky Way":
 *  1. A diagonal band of dense starlight crossing the whole sky.
 *  2. A burnt-out warm-white galactic core sitting off-center on the band.
 *  3. The Great Rift: dark dust lanes splitting the band lengthwise.
 *  4. Cool star-cloud whites/blues with only whispers of rose and teal.
 *  5. Near-black blue sky everywhere else.
 *
 * Technique: additive point layers for the light (they bloom to white where
 * dense, exactly like long-exposure photos), then normal-blend dark sprites
 * laid over the band to carve the rift. All materials unlit; owned-time
 * animation with clamped deltas (see CodeVerse3D perf notes).
 */

const BAND_TILT = -0.48;
const CORE_X = -2.2;

function stepTime(time: MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

/** Soft round star dot shared by every point layer. */
function useDotTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const s = 64;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.35, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/** Warm radial glow for the core (drawn in light tones, additive). */
function useGlowTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const s = 256;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,246,224,1)");
    g.addColorStop(0.25, "rgba(255,232,190,0.75)");
    g.addColorStop(0.55, "rgba(255,214,160,0.28)");
    g.addColorStop(1, "rgba(255,200,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

/**
 * One irregular dark dust cloud, stretched wide. A row of these along the
 * band center reads as the Great Rift once overlapped.
 */
function useRiftTexture(): THREE.CanvasTexture {
  return useMemo(() => {
    const w = 256;
    const h = 128;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 26; i++) {
      const x = w * 0.08 + rnd() * w * 0.84;
      const y = h * 0.3 + rnd() * h * 0.4;
      const r = 14 + rnd() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.35 + rnd() * 0.4;
      g.addColorStop(0, `rgba(3,4,10,${a.toFixed(2)})`);
      g.addColorStop(1, "rgba(3,4,10,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.7, r * 0.75, (rnd() - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

type CloudData = { positions: Float32Array; colors: Float32Array; count: number };

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

/** Star color temperature: hot blue-white -> white -> warm gold -> ember. */
const TEMPS = [
  new THREE.Color("#bcd2ff"),
  new THREE.Color("#e8eeff"),
  new THREE.Color("#ffffff"),
  new THREE.Color("#ffe9c9"),
  new THREE.Color("#ffc98a"),
  new THREE.Color("#ff9d6b"),
];

function pickTemp(col: THREE.Color, warmth: number) {
  const r = Math.random();
  if (r < 0.22) col.copy(TEMPS[0]);
  else if (r < 0.5) col.copy(TEMPS[1]);
  else if (r < 0.72) col.copy(TEMPS[2]);
  else if (r < 0.9) col.copy(TEMPS[3]).lerp(TEMPS[4], warmth);
  else col.copy(TEMPS[5]);
  return col;
}

/** The great diagonal star band, brightest near the core. */
function useStarBand(): CloudData {
  return useMemo(() => {
    const count = 9000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      // density peaks toward the core, thinning to the rim
      const u = CORE_X + gauss() * 5.2 + (Math.random() * 2 - 1) * 4.5;
      const thickness = 0.5 + Math.min(1.4, Math.abs(u - CORE_X) * 0.22);
      const v = gauss() * thickness;
      const w = gauss() * 0.9;
      positions[i * 3] = u;
      positions[i * 3 + 1] = v;
      positions[i * 3 + 2] = w;
      const coreBoost = Math.max(0, 1 - Math.abs(u - CORE_X) / 6);
      pickTemp(col, coreBoost);
      col.multiplyScalar((0.35 + Math.random() * 0.65) * (0.45 + coreBoost * 0.9));
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { positions, colors, count };
  }, []);
}

/** Dense bright knots + dark-lane gaps need sharper foreground stars. */
function useBrightKnots(): CloudData {
  return useMemo(() => {
    const count = 900;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const u = CORE_X + gauss() * 6.5;
      const v = gauss() * 1.1;
      positions[i * 3] = u;
      positions[i * 3 + 1] = v;
      positions[i * 3 + 2] = 0.6 + Math.random() * 0.8;
      pickTemp(col, 0.4);
      col.multiplyScalar(0.9 + Math.random() * 0.9);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { positions, colors, count };
  }, []);
}

function StarLayer({ data, size, opacity, map }: { data: CloudData; size: number; opacity: number; map: THREE.Texture }) {
  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[data.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        map={map}
        vertexColors
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/** The burnt-out heart of the galaxy: tight glow + wide halo, gently breathing. */
function GalacticCore({ glow }: { glow: THREE.Texture }) {
  const tight = useRef<THREE.Sprite>(null);
  const wide = useRef<THREE.Sprite>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    const t = stepTime(time, rawDelta);
    const b = 1 + Math.sin(t * 0.5) * 0.05;
    if (tight.current) tight.current.scale.set(3.4 * b, 3.4 * b, 1);
    if (wide.current) wide.current.scale.set(8.5 / b, 8.5 / b, 1);
  });
  return (
    <group position={[CORE_X, 0, 0.4]}>
      <sprite ref={wide}>
        <spriteMaterial map={glow} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <sprite ref={tight}>
        <spriteMaterial map={glow} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
    </group>
  );
}

/** Great Rift: a chain of dark clouds laid over the band center. */
function DustRift({ map }: { map: THREE.Texture }) {
  const lanes = useMemo(() => {
    const arr: { x: number; y: number; sx: number; sy: number; rot: number; op: number }[] = [];
    for (let x = -8; x <= 5; x += 1.15) {
      const taper = Math.max(0.25, 1 - Math.abs(x - CORE_X) / 9);
      arr.push({
        x: x + (Math.random() - 0.5) * 0.7,
        y: (Math.random() - 0.5) * 0.7,
        sx: (5 + Math.random() * 2.5) * taper + 2,
        sy: 1.1 + Math.random() * 0.7,
        rot: (Math.random() - 0.5) * 0.35,
        op: 0.5 + Math.random() * 0.35,
      });
    }
    return arr;
  }, []);
  return (
    <group>
      {lanes.map((l, i) => (
        <sprite key={i} position={[l.x, l.y, 1.1]} scale={[l.sx, l.sy, 1]} rotation={l.rot}>
          {/* normal blending + dark texture = carves the starlight beneath */}
          <spriteMaterial map={map} transparent opacity={l.op} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Whispers of rose / slate / teal for depth — kept faint on purpose. */
const VEILS = [
  { c: ["rgba(150,80,105,0.5)", "rgba(150,80,105,0)"], pos: [-4.6, 1.4, -3] as const, s: 8, o: 0.22 },
  { c: ["rgba(70,90,150,0.5)", "rgba(70,90,150,0)"], pos: [4.4, -1.6, -4] as const, s: 10, o: 0.2 },
  { c: ["rgba(50,110,125,0.45)", "rgba(50,110,125,0)"], pos: [1.5, 2.4, -5] as const, s: 7, o: 0.16 },
];

function Veils() {
  const texs = useMemo(
    () =>
      VEILS.map((v) => {
        const [c0, c1] = v.c;
        const s = 128;
        const cv = document.createElement("canvas");
        cv.width = cv.height = s;
        const ctx = cv.getContext("2d")!;
        const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, c0);
        g.addColorStop(1, c1);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, s, s);
        const tex = new THREE.CanvasTexture(cv);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      }),
    []
  );
  useEffect(() => () => texs.forEach((t) => t.dispose()), [texs]);
  return (
    <group>
      {VEILS.map((v, i) => (
        <sprite key={i} position={[v.pos[0], v.pos[1], v.pos[2]]} scale={[v.s, v.s, 1]}>
          <spriteMaterial map={texs[i]} transparent opacity={v.o} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      ))}
    </group>
  );
}

/** Whole band: near-frozen drift + mouse parallax (long exposures barely move). */
function Band({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const time = useRef(0);
  useFrame((state, rawDelta) => {
    if (!ref.current) return;
    const t = stepTime(time, rawDelta);
    ref.current.rotation.z = BAND_TILT + Math.sin(t * 0.04) * 0.008;
    ref.current.position.x = Math.sin(t * 0.03) * 0.15;
    ref.current.rotation.y = THREE.MathUtils.lerp(ref.current.rotation.y, state.pointer.x * 0.1, 0.03);
    ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, -state.pointer.y * 0.06, 0.03);
  });
  return (
    <group ref={ref} position={[0, 0.3, -2.5]}>
      {children}
    </group>
  );
}

function streakTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 16;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.7, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const METEOR_ANGLE = Math.PI / 6;

function Meteor({ seed, tex }: { seed: number; tex: THREE.Texture }) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const head = useRef<THREE.MeshBasicMaterial>(null);
  const time = useRef(0);
  useFrame((_, rawDelta) => {
    if (!group.current || !mat.current || !head.current) return;
    const t = stepTime(time, rawDelta);
    const cycle = 11;
    const local = ((t + seed * cycle * 0.37) % cycle) / cycle;
    const active = local < 0.18 ? local / 0.18 : -1;
    if (active < 0) {
      mat.current.opacity = 0;
      head.current.opacity = 0;
      return;
    }
    const fade = Math.sin(active * Math.PI);
    const dist = active * 9;
    group.current.position.set(
      7 - seed * 1.9 - Math.cos(METEOR_ANGLE) * dist,
      4.4 - seed * 0.7 - Math.sin(METEOR_ANGLE) * dist,
      -1.5
    );
    mat.current.opacity = fade * 0.7;
    head.current.opacity = fade * 0.9;
  });
  return (
    <group ref={group} rotation={[0, 0, Math.PI + METEOR_ANGLE]}>
      <mesh position={[-0.7, 0, 0]}>
        <planeGeometry args={[1.6, 0.08]} />
        <meshBasicMaterial
          ref={mat}
          map={tex}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial ref={head} color="#ffffff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

function Scene() {
  const dot = useDotTexture();
  const glow = useGlowTexture();
  const rift = useRiftTexture();
  const band = useStarBand();
  const knots = useBrightKnots();
  const streak = useMemo(() => streakTexture(), []);
  useEffect(
    () => () => {
      dot.dispose();
      glow.dispose();
      rift.dispose();
      streak.dispose();
    },
    [dot, glow, rift, streak]
  );
  return (
    <>
      <Stars radius={70} depth={50} count={1100} factor={3} saturation={0.15} fade speed={0.3} />
      <Veils />
      <Band>
        <StarLayer data={band} size={0.075} opacity={0.85} map={dot} />
        <StarLayer data={knots} size={0.11} opacity={0.9} map={dot} />
        <GalacticCore glow={glow} />
        {/* rift AFTER the light so it swallows starlight like real dust */}
        <DustRift map={rift} />
      </Band>
      <Meteor seed={0} tex={streak} />
      <Meteor seed={1} tex={streak} />
    </>
  );
}

export default function GalaxyCanvas({ className }: { className?: string }) {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div aria-hidden className={className ?? "fixed inset-0 -z-10 overflow-hidden bg-[#02030a]"}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 55 }}
        dpr={[1, 1.5]}
        frameloop={reduced ? "never" : "always"}
        performance={{ min: 0.5 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
      {/* legibility veils: gentle top shade + bottom fade into the page */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,transparent_45%,rgba(2,3,10,0.6)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-[#02030a]" />
    </div>
  );
}
