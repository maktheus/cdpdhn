/**
 * Árvore 3D da marca, feita só com geometria procedural (nenhum arquivo 3D externo).
 *
 *  mode="intro"      as folhas voam até a copa, os troncos crescem, as cabeças surgem.
 *  mode="celebrate"  árvore pronta; uma folha nova voa até o topo (o atendimento recém-registrado)
 *                    e a copa responde com uma onda suave.
 *
 * Segue o ponteiro com rotação leve, pausa fora da tela e respeita prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

type Mode = 'intro' | 'celebrate';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Folha: contorno em Bézier, extrudada com chanfro (volume macio) e levemente côncava. */
function leafGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.36, 0.22, 0.4, 0.78, 0, 1.18);
  s.bezierCurveTo(-0.4, 0.78, -0.36, 0.22, 0, 0);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.02,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 5,
    curveSegments: 22
  });
  g.translate(0, 0, -0.01);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, p.getZ(i) + x * x * 0.9 - Math.sin((y / 1.18) * Math.PI) * 0.06);
  }
  g.computeVertexNormals();
  return g;
}

/** Tubo que afina nas pontas, como um traço de pincel. */
function taperedTube(points: THREE.Vector3[], radius: number) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
  const tubular = 96;
  const radial = 18;
  const g = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    const c = curve.getPointAt(u);
    const k = 0.32 + 0.68 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.6);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      v.fromBufferAttribute(p, idx).sub(c).multiplyScalar(k).add(c);
      p.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(10,56,38,0.42)');
  gr.addColorStop(1, 'rgba(10,56,38,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

interface Leaf {
  mesh: THREE.Mesh;
  tPos: THREE.Vector3;
  sPos: THREE.Vector3;
  tRot: THREE.Euler;
  sRot: THREE.Euler;
  scale: number;
  delay: number;
  phase: number;
  angle: number;
}

const CROWN = new THREE.Vector3(0, 0.55, 0);
const GREENS = ['#4F8E22', '#62A12C', '#437D1C', '#73B23A', '#58962A', '#7DBB43'];

export default function Tree3D({ mode = 'intro', label }: { mode?: Mode; label?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.98;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xfff6e2, 0x24402b, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(-4, 7, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xd2ecff, 0.8);
    rim.position.set(4, 3, -6);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);

    // ── Copa ──
    const geo = leafGeometry();
    const mats = GREENS.map(
      (c) =>
        new THREE.MeshPhysicalMaterial({
          color: c,
          roughness: 0.48,
          clearcoat: 0.3,
          clearcoatRoughness: 0.45,
          sheen: 0.12,
          sheenColor: new THREE.Color('#D9F2B5'),
          envMapIntensity: 0.32,
          side: THREE.DoubleSide
        })
    );

    const rnd = (() => {
      let a = 11;
      return () => {
        a = (a * 16807) % 2147483647;
        return a / 2147483647;
      };
    })();

    const leaves: Leaf[] = [];
    const rings = [
      { r: 3.0, from: 194, to: -14, n: 17, scale: 1.0, z: 0 },
      { r: 2.05, from: 166, to: 14, n: 11, scale: 0.82, z: 0.35 }
    ];
    const reservedSlot = mode === 'celebrate' ? 8 : -1; // topo da copa (90°) fica vago para a folha nova
    rings.forEach((ring, ri) => {
      for (let k = 0; k < ring.n; k++) {
        if (ri === 0 && k === reservedSlot) continue;
        const deg = lerp(ring.from, ring.to, k / (ring.n - 1)) + (rnd() - 0.5) * 4;
        const a = THREE.MathUtils.degToRad(deg);
        const r = ring.r + (rnd() - 0.5) * 0.2;
        const tPos = new THREE.Vector3(CROWN.x + Math.cos(a) * r, CROWN.y + Math.sin(a) * r, ring.z + (rnd() - 0.5) * 0.7);
        const tRot = new THREE.Euler((rnd() - 0.5) * 0.5, (rnd() - 0.5) * 0.7, a - Math.PI / 2 + (rnd() - 0.5) * 0.25);
        const out = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
        const sPos = tPos.clone().addScaledVector(out, 3 + rnd() * 3).add(new THREE.Vector3((rnd() - 0.5) * 2, (rnd() - 0.2) * 2, 3 + rnd() * 5));
        const sRot = new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6);
        const mesh = new THREE.Mesh(geo, mats[Math.floor(rnd() * mats.length)]);
        const scale = ring.scale * (0.88 + rnd() * 0.24);
        root.add(mesh);
        leaves.push({ mesh, tPos, sPos, tRot, sRot, scale, delay: 0.2 + (1 - (deg + 20) / 220) * 0.9 + ri * 0.25 + rnd() * 0.12, phase: rnd() * 6.28, angle: a });
      }
    });

    // ── Figuras (duas pessoas + a criança verde no centro) ──
    const bark = new THREE.MeshPhysicalMaterial({ color: '#8F4E1E', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3, envMapIntensity: 0.5 });
    const clay = new THREE.MeshPhysicalMaterial({ color: '#DE9F5F', roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.4, sheen: 0.3, envMapIntensity: 0.5 });
    const leafMat = mats[1];
    const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
    const tubes = [
      new THREE.Mesh(taperedTube([V(-1.26, 1.36, 0.1), V(-0.39, 0.68, 0.25), V(0.39, -0.49, 0.3), V(0.6, -1.55, 0.2), V(0.34, -2.6, 0.1), V(0.05, -3.25, 0)], 0.2), bark),
      new THREE.Mesh(taperedTube([V(1.26, 1.36, -0.1), V(0.39, 0.68, 0.0), V(-0.29, -0.49, 0.05), V(-0.5, -1.55, 0.0), V(-0.36, -2.7, -0.05), V(-0.2, -3.3, -0.05)], 0.2), clay),
      new THREE.Mesh(taperedTube([V(-0.45, -0.2, 0.3), V(-1.36, -0.42, 0.3), V(-2.15, -0.24, 0.25)], 0.15), bark),
      new THREE.Mesh(taperedTube([V(0.5, -0.2, 0.05), V(1.36, -0.42, 0.05), V(2.12, -0.24, 0.05)], 0.15), clay)
    ];
    tubes.forEach((t) => root.add(t));
    const headGeo = new THREE.SphereGeometry(0.4, 48, 32);
    const heads = [
      { mesh: new THREE.Mesh(headGeo, bark), pos: V(-1.08, 0.36, 0.35), delay: 0.9 },
      { mesh: new THREE.Mesh(headGeo, clay), pos: V(1.04, 0.36, 0.15), delay: 1.0 },
      { mesh: new THREE.Mesh(headGeo, leafMat), pos: V(0, 1.38, 0.1), delay: 1.15 }
    ];
    heads.forEach((h) => {
      h.mesh.position.copy(h.pos);
      root.add(h.mesh);
    });

    // ── Sombra de contato ──
    const shTex = shadowTexture();
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -3.38, 0);
    root.add(shadow);

    // ── Sementes flutuando ──
    const seedGeo = new THREE.SphereGeometry(0.04, 10, 8);
    const seedMat = new THREE.MeshBasicMaterial({ color: '#CFE8A8', transparent: true, opacity: 0.75 });
    const seeds = Array.from({ length: 16 }, () => {
      const m = new THREE.Mesh(seedGeo, seedMat);
      m.position.set((rnd() - 0.5) * 9, -3 + rnd() * 8, (rnd() - 0.5) * 3);
      root.add(m);
      return { m, speed: 0.12 + rnd() * 0.22, phase: rnd() * 6.28, x0: m.position.x };
    });

    // ── Folha nova (modo celebrate) ──
    const newLeafMat = new THREE.MeshPhysicalMaterial({ color: '#8FCF4C', roughness: 0.35, clearcoat: 0.7, emissive: new THREE.Color('#A8E063'), emissiveIntensity: 0.8, side: THREE.DoubleSide, envMapIntensity: 0.6 });
    const newLeaf = mode === 'celebrate' ? new THREE.Mesh(geo, newLeafMat) : null;
    const nlTarget = V(CROWN.x, CROWN.y + 3.05, 0.25);
    const nlStart = V(1.6, -5, 7);
    const nlCtrl = V(4.2, 2.8, 5);
    if (newLeaf) {
      newLeaf.scale.setScalar(0.001);
      root.add(newLeaf);
    }

    // ── Tamanho / câmera ──
    const fit = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      const needH = 9.6;
      const needW = 10.4;
      const visH = Math.max(needH, needW / aspect);
      const z = visH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      camera.position.set(0, 0.7, z);
      camera.lookAt(0, 0.65, 0);
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // ── Ponteiro ──
    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = clamp01((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.y = clamp01((e.clientY - r.top) / r.height) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);

    // ── Laço de animação ──
    const skipIntro = mode === 'celebrate' || reduced;
    const t0 = performance.now() - (skipIntro ? 10_000 : 0);
    const tCel0 = performance.now();
    const LAND = 2.1;
    let raf = 0;
    let visible = true;
    const curRot = { x: 0, y: 0 };

    const frame = (now: number) => {
      const t = (now - t0) / 1000;
      const ct = (now - tCel0) / 1000; // tempo desde a montagem (para a folha nova)
      const idle = reduced ? 0 : 1;
      const sinceLand = ct - LAND;
      const ripple = newLeaf && sinceLand > 0 ? Math.exp(-sinceLand * 2.2) : 0;

      for (const L of leaves) {
        const p = clamp01((t - L.delay) / 1.25);
        const e = easeOutCubic(p);
        const s = easeOutBack(p);
        L.mesh.position.lerpVectors(L.sPos, L.tPos, e);
        L.mesh.position.y += Math.sin(t * 0.8 + L.phase) * 0.035 * e * idle;
        const wave = ripple * Math.sin(sinceLand * 9 - Math.abs(L.angle - Math.PI / 2) * 3) * 0.16;
        L.mesh.rotation.set(
          lerp(L.sRot.x, L.tRot.x, e) + Math.sin(t * 0.9 + L.phase) * 0.08 * e * idle,
          lerp(L.sRot.y, L.tRot.y, e) + Math.cos(t * 0.7 + L.phase) * 0.06 * e * idle,
          lerp(L.sRot.z, L.tRot.z, e) + Math.sin(t * 1.15 + L.phase) * 0.045 * e * idle + wave
        );
        L.mesh.scale.setScalar(Math.max(0.0001, L.scale * s));
      }

      const grow = easeInOut(clamp01((t - 0.05) / 1.3));
      tubes.forEach((tb) => {
        const total = tb.geometry.index!.count;
        tb.geometry.setDrawRange(0, Math.floor((total * grow) / 3) * 3);
      });
      heads.forEach((h) => h.mesh.scale.setScalar(Math.max(0.0001, easeOutBack(clamp01((t - h.delay) / 0.6)))));
      shadow.material.opacity = grow;

      if (!reduced) {
        for (const sd of seeds) {
          sd.m.position.y += sd.speed * 0.016;
          sd.m.position.x = sd.x0 + Math.sin(t * 0.6 + sd.phase) * 0.35;
          if (sd.m.position.y > 5.2) sd.m.position.y = -3.2;
        }
      }

      if (newLeaf) {
        const p = clamp01((ct - 0.5) / (LAND - 0.5));
        const e = easeInOut(p);
        const a = 1 - e;
        newLeaf.position.set(
          a * a * nlStart.x + 2 * a * e * nlCtrl.x + e * e * nlTarget.x,
          a * a * nlStart.y + 2 * a * e * nlCtrl.y + e * e * nlTarget.y,
          a * a * nlStart.z + 2 * a * e * nlCtrl.z + e * e * nlTarget.z
        );
        newLeaf.rotation.set((1 - e) * 2.4, (1 - e) * 3.2 + Math.sin(t * 0.9) * 0.06 * e, (1 - e) * -5 + Math.sin(t * 1.1) * 0.04 * e);
        newLeaf.scale.setScalar(Math.max(0.0001, lerp(0.35, 1.15, easeOutBack(p))));
        newLeafMat.emissiveIntensity = sinceLand > 0 ? 0.8 * Math.exp(-sinceLand * 0.9) : 0.8;
        root.scale.setScalar(1 + ripple * 0.035 * Math.sin(sinceLand * 8));
      }

      const targetY = pointer.x * 0.32 + Math.sin(t * 0.22) * 0.08 * idle;
      const targetX = pointer.y * 0.1;
      curRot.y += (targetY - curRot.y) * 0.05;
      curRot.x += (targetX - curRot.x) * 0.05;
      root.rotation.set(curRot.x, curRot.y, 0);

      renderer.render(scene, camera);
      if (visible) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      const was = visible;
      visible = entry.isIntersecting && document.visibilityState === 'visible';
      if (visible && !was) raf = requestAnimationFrame(frame);
    });
    io.observe(el);
    const onVis = () => {
      const was = visible;
      visible = document.visibilityState === 'visible';
      if (visible && !was) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      visible = false;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      [...mats, bark, clay, newLeafMat, seedMat, shadow.material].forEach((m) => m.dispose());
      shTex.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mode]);

  if (failed) return <FallbackTree label={label} />;
  return <div ref={host} role="img" aria-label={label} style={{ width: '100%', height: '100%' }} />;
}

/** Sem WebGL: a mesma árvore em SVG estático. */
function FallbackTree({ label }: { label?: string }) {
  return (
    <svg viewBox="40 40 432 440" role="img" aria-label={label} style={{ width: '100%', height: '100%' }}>
      <g fill="#6AA632">
        <path d="M256 70c26 30 26 74 0 104c-26-30-26-74 0-104z" />
        <path d="M150 104c38 8 64 42 60 82c-38-8-64-42-60-82z" />
        <path d="M362 104c4 40-22 74-60 82c-4-40 22-74 60-82z" />
        <path d="M86 196c38-6 74 18 84 56c-38 6-74-18-84-56z" />
        <path d="M426 196c-10 38-46 62-84 56c10-38 46-62 84-56z" />
      </g>
      <circle cx="214" cy="262" r="30" fill="#8F4E1E" />
      <circle cx="298" cy="262" r="30" fill="#DE9F5F" />
      <path d="M168 312c40 10 70 36 86 76c12 30 14 54 10 76" stroke="#8F4E1E" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d="M344 312c-40 10-70 36-86 76c-12 30-14 54-10 76" stroke="#DE9F5F" strokeWidth="30" fill="none" strokeLinecap="round" />
    </svg>
  );
}
