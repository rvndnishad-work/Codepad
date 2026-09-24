"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { TOPIC_LOGO_SVGS, type LogoSvg } from "./logo-svgs";

/**
 * TECH LOGO 3D — the topic's logo as a solid, glowing object that turns
 * slowly in the topic hero. Brand logos are extruded from their SVG; plain
 * icons become neon tubes along their strokes. A halo, a rim shell and an
 * orbiting ring carry the glow (no post-processing). Mouse tilts it; it
 * pauses offscreen and holds a still pose under reduced motion.
 */

/** Longest side of the logo in scene units. */
const SIZE = 3;

/** A 2D SVG path lifted into 3D (y flipped so the logo is upright). */
class PathCurve3 extends THREE.Curve<THREE.Vector3> {
  constructor(private path: THREE.Path) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const p = this.path.getPoint(t);
    return target.set(p.x, -p.y, 0);
  }
}

/** Builds one centred, scaled geometry for the logo. */
function buildGeometry(logo: LogoSvg): THREE.BufferGeometry | null {
  const data = new SVGLoader().parse(logo.svg);
  const parts: THREE.BufferGeometry[] = [];

  for (const path of data.paths) {
    if (logo.kind === "fill") {
      const shapes = path.toShapes();
      if (shapes.length === 0) continue;
      const g = new THREE.ExtrudeGeometry(shapes, {
        depth: 2.4,
        bevelEnabled: true,
        bevelThickness: 0.35,
        bevelSize: 0.18,
        bevelSegments: 3,
        curveSegments: 32,
      });
      // SVG y points down; a half turn about x makes it upright and keeps the winding.
      g.rotateX(Math.PI);
      parts.push(g.index ? g.toNonIndexed() : g);
    } else {
      for (const sub of path.subPaths) {
        const pts = sub.getPoints();
        if (pts.length < 2) continue;
        const closed = pts[0].distanceTo(pts[pts.length - 1]) < 0.01;
        const segs = Math.max(24, Math.round(sub.getLength() * 6));
        const g = new THREE.TubeGeometry(new PathCurve3(sub), segs, 1.05, 12, closed);
        parts.push(g.index ? g.toNonIndexed() : g);
      }
    }
  }
  if (parts.length === 0) return null;

  // Brand logos are fills and stroke icons are tubes, so the parts share attributes.
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts, false);
  if (!merged) return null;
  merged.computeBoundingBox();
  const box = merged.boundingBox!;
  const size = new THREE.Vector3();
  const centre = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(centre);
  merged.translate(-centre.x, -centre.y, -centre.z);
  const s = SIZE / Math.max(size.x, size.y);
  merged.scale(s, s, s);
  return merged;
}

/** Edge glow: bright where the surface turns away from the camera, clear face on. */
const RIM_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const RIM_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float rim = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.2);
    gl_FragColor = vec4(uColor * rim * uStrength, rim * uStrength);
  }
`;

/** Soft radial halo drawn once into a canvas. */
function useHaloTexture() {
  return useMemo(() => {
    const S = 256;
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, "rgba(255,255,255,0.9)");
    g.addColorStop(0.3, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function stepTime(time: React.MutableRefObject<number>, rawDelta: number) {
  time.current += Math.min(rawDelta, 0.05);
  return time.current;
}

function Logo({
  logo,
  still,
  pointer,
}: {
  logo: LogoSvg;
  still: boolean;
  pointer: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const spin = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Sprite>(null);
  const ring = useRef<THREE.Group>(null);
  const time = useRef(0);
  const geometry = useMemo(() => buildGeometry(logo), [logo]);
  const haloTex = useHaloTexture();
  const color = useMemo(() => new THREE.Color(logo.color), [logo.color]);
  const body = useMemo(() => new THREE.Color(logo.body ?? logo.color), [logo.body, logo.color]);
  const rimUniforms = useMemo(() => ({ uColor: { value: color }, uStrength: { value: 1.4 } }), [color]);

  useEffect(() => () => geometry?.dispose(), [geometry]);

  const tilt = useRef({ x: 0, y: 0 });

  useFrame((_, rawDelta) => {
    const t = stepTime(time, still ? 0 : rawDelta);
    // ease toward the pointer so the tilt never snaps
    const k = still ? 1 : Math.min(1, rawDelta * 4);
    tilt.current.x += ((still ? 0 : pointer.current.x) - tilt.current.x) * k;
    tilt.current.y += ((still ? 0 : pointer.current.y) - tilt.current.y) * k;
    if (spin.current) {
      // Full turns that linger face on and hurry through the mirrored back.
      const phase = t * 0.6;
      spin.current.rotation.y = still ? -0.45 : phase - 0.75 * Math.sin(phase);
      spin.current.rotation.x = Math.sin(t * 0.6) * 0.12 - tilt.current.y * 0.3;
      spin.current.rotation.z = tilt.current.x * -0.12;
      spin.current.position.y = Math.sin(t * 1.1) * 0.08;
    }
    if (halo.current) {
      const pulse = 1 + Math.sin(t * 1.6) * 0.06;
      halo.current.scale.setScalar(6.2 * pulse);
      (halo.current.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(t * 1.6) * 0.1;
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.4;
      ring.current.rotation.x = 1.15 + Math.sin(t * 0.5) * 0.08;
    }
  });

  if (!geometry) return null;

  return (
    <group>
      {haloTex && (
        <sprite ref={halo} position={[0, 0, -1.2]} scale={6.2}>
          <spriteMaterial map={haloTex} color={color} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
      )}

      <group ref={spin}>
        <mesh geometry={geometry}>
          <meshStandardMaterial
            color={body}
            emissive={body}
            emissiveIntensity={logo.body ? 0.1 : 0.45}
            metalness={0.45}
            roughness={0.28}
          />
        </mesh>
        {logo.core && (
          // sits mid-depth, so it only shows through the cut-outs
          <mesh>
            <circleGeometry args={[SIZE * 0.47, 64]} />
            <meshBasicMaterial color={logo.core} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        )}
        {/* rim glow: a slightly larger additive shell that lights up at the edges */}
        <mesh geometry={geometry} scale={1.04}>
          <shaderMaterial
            uniforms={rimUniforms}
            vertexShader={RIM_VERTEX}
            fragmentShader={RIM_FRAGMENT}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <group ref={ring}>
        <mesh>
          <torusGeometry args={[2.35, 0.012, 8, 160]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
        <mesh position={[2.35, 0, 0]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[-2.35, 0, 0]}>
          <sphereGeometry args={[0.045, 16, 16]} />
          <meshBasicMaterial color={color} />
        </mesh>
      </group>

      <ambientLight intensity={0.55} />
      <directionalLight position={[-3, 4, 5]} intensity={1.6} />
      <pointLight position={[3, -2, 3]} intensity={18} distance={12} color={color} />
    </group>
  );
}

export default function TechLogo3D({ tech }: { tech: string }) {
  const logo = TOPIC_LOGO_SVGS[tech];
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still, setStill] = useState(false);
  // The canvas takes no pointer events, so the tilt follows the pointer across the whole page.
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = wrap.current?.getBoundingClientRect();
      if (!r) return;
      const clamp = (v: number) => Math.max(-1, Math.min(1, v));
      pointer.current.x = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2));
      pointer.current.y = clamp(-(e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const el = wrap.current;
    const obs = el ? new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 }) : null;
    if (el && obs) obs.observe(el);
    return () => {
      mq.removeEventListener("change", sync);
      obs?.disconnect();
    };
  }, []);

  if (!logo) return null;

  return (
    <div ref={wrap} className="h-full w-full" aria-hidden>
      <Canvas
        camera={{ position: [0, 0, 7.2], fov: 42 }}
        dpr={[1, 1.75]}
        frameloop={!visible ? "never" : still ? "demand" : "always"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <Logo logo={logo} still={still} pointer={pointer} />
      </Canvas>
    </div>
  );
}
