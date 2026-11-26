import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface NetworkNodeMeta {
  id: string;
  label: string;
  role: string;
  description: string;
  position: [number, number, number];
  accentHex: number;
}

const NETWORK_NODES: NetworkNodeMeta[] = [
  {
    id: 'students',
    label: 'Students',
    role: '01 · Talent Origin',
    description:
      'Verified academic profiles, Career Passports, projects, and resumes ready for discovery.',
    position: [-3.4, -0.55, 0.3],
    accentHex: 0xd4d4d4,
  },
  {
    id: 'universities',
    label: 'Universities',
    role: '02 · Institutional Trust',
    description:
      'Placement cells verify organizations, approve roles, and oversee transparent campus drives.',
    position: [-1.15, 0.45, -0.45],
    accentHex: 0xa3a3a3,
  },
  {
    id: 'companies',
    label: 'Companies',
    role: '03 · Verified Recruiters',
    description:
      'Approved hiring teams review portfolios, schedule interviews, and mentor selected interns.',
    position: [1.15, -0.2, 0.45],
    accentHex: 0xe5e5e5,
  },
  {
    id: 'opportunities',
    label: 'Opportunities',
    role: '04 · Career Flight',
    description:
      'Structured internships, milestone tracking, and verified outcomes that launch real careers.',
    position: [3.4, 0.65, -0.25],
    accentHex: 0xffffff,
  },
];

interface EcosystemNetwork3DProps {
  className?: string;
}

export const EcosystemNetwork3D: React.FC<EcosystemNetwork3DProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const activeIndexRef = useRef<number>(0);
  const [useFallback, setUseFallback] = useState<boolean>(false);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setUseFallback(true);
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallViewport = window.innerWidth < 768;
    if (reducedMotion || isSmallViewport) {
      setUseFallback(true);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setUseFallback(true);
      return;
    }

    const gl = renderer.getContext();
    const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = debugExt
      ? String(gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) || '')
      : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Mesa|Microsoft Basic Render Driver/i.test(
      rendererStr
    );

    const width = container.clientWidth || 560;
    const height = container.clientHeight || 360;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 0.85, 8.8);
    camera.lookAt(0, 0.1, 0);

    // Pure monochromatic studio lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x090909, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
    keyLight.position.set(5, 7, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xa3a3a3, 1.0);
    rimLight.position.set(-6, 3, -5);
    scene.add(rimLight);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Architectural horizon grid ring
    const baseRingGeo = new THREE.RingGeometry(4.15, 4.19, 72);
    const baseRingMat = new THREE.MeshBasicMaterial({
      color: 0x525252,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.y = -1.35;
    rootGroup.add(baseRing);

    const disposables: Array<{ dispose: () => void }> = [baseRingGeo, baseRingMat];

    // 4 monochromatic brushed-metal / graphite hubs
    const nodeGroups: THREE.Group[] = [];
    const nodeOrbitRings: THREE.Mesh[] = [];
    const pickTargets: THREE.Object3D[] = [];

    const coreMetalMat = new THREE.MeshStandardMaterial({
      color: 0x202020,
      roughness: 0.25,
      metalness: 0.75,
    });
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xe5e5e5,
      roughness: 0.25,
      metalness: 0.5,
    });
    disposables.push(coreMetalMat, silverMat);

    NETWORK_NODES.forEach((meta, idx) => {
      const hub = new THREE.Group();
      hub.position.set(...meta.position);
      hub.userData = { nodeIndex: idx };

      const accentMat = new THREE.MeshStandardMaterial({
        color: meta.accentHex,
        emissive: meta.accentHex,
        emissiveIntensity: 0.14,
        roughness: 0.22,
        metalness: 0.65,
      });
      disposables.push(accentMat);

      const pedestalGeo = new THREE.CylinderGeometry(0.52, 0.6, 0.12, 32);
      const pedestal = new THREE.Mesh(pedestalGeo, coreMetalMat);
      pedestal.position.y = -0.36;
      pedestal.userData = { nodeIndex: idx };
      hub.add(pedestal);
      disposables.push(pedestalGeo);

      let coreMesh: THREE.Mesh;
      if (idx === 0) {
        const geo = new THREE.IcosahedronGeometry(0.36, 0);
        coreMesh = new THREE.Mesh(geo, accentMat);
        coreMesh.position.y = 0.08;
        disposables.push(geo);
      } else if (idx === 1) {
        const geo = new THREE.OctahedronGeometry(0.38, 0);
        coreMesh = new THREE.Mesh(geo, accentMat);
        coreMesh.position.y = 0.1;
        disposables.push(geo);

        const capGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 6);
        const cap = new THREE.Mesh(capGeo, silverMat);
        cap.position.y = -0.2;
        hub.add(cap);
        disposables.push(capGeo);
      } else if (idx === 2) {
        const geo = new THREE.BoxGeometry(0.48, 0.56, 0.48);
        coreMesh = new THREE.Mesh(geo, accentMat);
        coreMesh.position.y = 0.08;
        coreMesh.rotation.y = Math.PI / 4;
        disposables.push(geo);
      } else {
        const geo = new THREE.ConeGeometry(0.38, 0.72, 6);
        coreMesh = new THREE.Mesh(geo, accentMat);
        coreMesh.position.y = 0.14;
        disposables.push(geo);
      }
      coreMesh.userData = { nodeIndex: idx };
      hub.add(coreMesh);

      const collarGeo = new THREE.TorusGeometry(0.62, 0.024, 14, 48);
      const collarMat = new THREE.MeshStandardMaterial({
        color: meta.accentHex,
        roughness: 0.25,
        metalness: 0.8,
        transparent: true,
        opacity: 0.7,
      });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.rotation.x = Math.PI / 2.4;
      collar.rotation.y = idx * 0.4;
      hub.add(collar);
      nodeOrbitRings.push(collar);
      disposables.push(collarGeo, collarMat);

      const hitGeo = new THREE.SphereGeometry(0.82, 12, 12);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(hitGeo, hitMat);
      hitMesh.userData = { nodeIndex: idx };
      hub.add(hitMesh);
      pickTargets.push(hitMesh);
      disposables.push(hitGeo, hitMat);

      rootGroup.add(hub);
      nodeGroups.push(hub);
    });

    // Curved TubeGeometry bridges
    const curves: THREE.CatmullRomCurve3[] = [];
    for (let i = 0; i < NETWORK_NODES.length - 1; i++) {
      const start = new THREE.Vector3(...NETWORK_NODES[i].position);
      const end = new THREE.Vector3(...NETWORK_NODES[i + 1].position);
      const mid = start.clone().lerp(end, 0.5);
      mid.y += 0.62;
      mid.z += i % 2 === 0 ? 0.35 : -0.35;
      curves.push(new THREE.CatmullRomCurve3([start, mid, end]));
    }
    const arcStart = new THREE.Vector3(...NETWORK_NODES[0].position);
    const arcEnd = new THREE.Vector3(...NETWORK_NODES[3].position);
    const arcPeak = new THREE.Vector3(0, 1.85, -0.35);
    curves.push(new THREE.CatmullRomCurve3([arcStart, arcPeak, arcEnd]));

    const bridgeMat = new THREE.MeshStandardMaterial({
      color: 0xa3a3a3,
      emissive: 0x737373,
      emissiveIntensity: 0.2,
      roughness: 0.25,
      metalness: 0.7,
      transparent: true,
      opacity: 0.85,
    });
    const highArcMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xa3a3a3,
      emissiveIntensity: 0.15,
      roughness: 0.3,
      metalness: 0.5,
      transparent: true,
      opacity: 0.42,
    });
    disposables.push(bridgeMat, highArcMat);

    curves.forEach((curve, i) => {
      const radius = i === curves.length - 1 ? 0.018 : 0.03;
      const tubeGeo = new THREE.TubeGeometry(curve, 36, radius, 8, false);
      const tube = new THREE.Mesh(tubeGeo, i === curves.length - 1 ? highArcMat : bridgeMat);
      rootGroup.add(tube);
      disposables.push(tubeGeo);
    });

    // Traveling light packets
    const packetGeo = new THREE.SphereGeometry(0.065, 12, 12);
    const packetMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    disposables.push(packetGeo, packetMat);

    const packets: Array<{ mesh: THREE.Mesh; curveIndex: number; offset: number; speed: number }> =
      [];
    curves.forEach((_, curveIndex) => {
      for (let p = 0; p < 2; p++) {
        const mesh = new THREE.Mesh(packetGeo, packetMat);
        rootGroup.add(mesh);
        packets.push({
          mesh,
          curveIndex,
          offset: p * 0.5 + curveIndex * 0.17,
          speed: curveIndex === curves.length - 1 ? 0.12 : 0.22,
        });
      }
    });

    // Subtle monochrome lattice dust
    const dustCount = 48;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 10;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xa3a3a3,
      size: 0.042,
      transparent: true,
      opacity: 0.5,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    rootGroup.add(dust);
    disposables.push(dustGeo, dustMat);

    const pointerTarget = { x: 0, y: 0 };
    const pointerCurrent = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const handlePointerMove = (e: PointerEvent) => {
      const rect = renderer!.domElement.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      pointerTarget.x = nx * 0.28;
      pointerTarget.y = ny * 0.16;
    };

    const handlePointerClick = (e: PointerEvent) => {
      const rect = renderer!.domElement.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(pickTargets, false);
      if (hits.length > 0) {
        const idx = hits[0].object.userData?.nodeIndex;
        if (typeof idx === 'number') {
          setActiveIndex(idx);
        }
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerClick);

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 560;
      const h = container.clientHeight || 360;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let elapsed = 0;
    let lastTime = performance.now();

    const scheduleNext = (fn: () => void) => {
      if (disposed) return;
      if (isSoftwareGl) {
        timerId = window.setTimeout(fn, 60);
      } else {
        rafId = window.requestAnimationFrame(fn);
      }
    };

    const animate = () => {
      if (disposed || !renderer) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      elapsed += dt;

      pointerCurrent.x = THREE.MathUtils.damp(pointerCurrent.x, pointerTarget.x, 4.5, dt);
      pointerCurrent.y = THREE.MathUtils.damp(pointerCurrent.y, pointerTarget.y, 4.5, dt);

      rootGroup.rotation.y = pointerCurrent.x + Math.sin(elapsed * 0.25) * 0.08;
      rootGroup.rotation.x = -pointerCurrent.y * 0.65;

      const selected = activeIndexRef.current;
      nodeGroups.forEach((grp, idx) => {
        const basePos = NETWORK_NODES[idx].position;
        const bob = Math.sin(elapsed * 1.4 + idx * 1.1) * 0.08;
        grp.position.y = basePos[1] + bob;
        const targetScale = idx === selected ? 1.18 : 0.96;
        const nextScale = THREE.MathUtils.damp(grp.scale.x, targetScale, 6, dt);
        grp.scale.setScalar(nextScale);
      });

      nodeOrbitRings.forEach((ring, idx) => {
        ring.rotation.z = elapsed * (idx % 2 === 0 ? 0.55 : -0.45);
      });

      packets.forEach((pkt) => {
        const t = (elapsed * pkt.speed + pkt.offset) % 1;
        curves[pkt.curveIndex].getPointAt(t, pkt.mesh.position);
      });

      dust.rotation.y = elapsed * 0.03;

      renderer.render(scene, camera);
      scheduleNext(animate);
    };

    scheduleNext(animate);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
      window.removeEventListener('resize', handleResize);
      if (renderer) {
        renderer.domElement.removeEventListener('pointermove', handlePointerMove);
        renderer.domElement.removeEventListener('pointerdown', handlePointerClick);
      }
      disposables.forEach((d) => d.dispose());
      envTarget.dispose();
      pmremGenerator.dispose();
      renderer?.dispose();
    };
  }, []);

  const activeNode = NETWORK_NODES[activeIndex];

  return (
    <div
      className={`rounded-xl border border-[#303030] bg-[#111111] overflow-hidden flex flex-col shadow-[0_16px_44px_rgba(0,0,0,0.45)] ${className}`}
    >
      <div className="px-4 py-3 border-b border-[#242424] flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#A3A3A3] font-semibold">
            Live Ecosystem Architecture
          </p>
          <p className="text-xs text-[#737373] mt-0.5">
            Select any node to trace how campus ambition connects to verified outcomes
          </p>
        </div>
        <span className="text-[11px] font-mono text-[#737373] hidden sm:inline">
          {useFallback ? 'Schematic' : 'Interactive 3D'}
        </span>
      </div>

      {/* Canvas or graceful monochromatic SVG fallback */}
      <div className="relative h-[260px] sm:h-[300px] w-full bg-[#090909]">
        {useFallback ? (
          <svg
            viewBox="0 0 640 280"
            className="w-full h-full"
            role="img"
            aria-label="Udaan connection network from Students to Universities to Companies to Opportunities"
          >
            <defs>
              <linearGradient id="udaanMonoArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#737373" />
                <stop offset="50%" stopColor="#A3A3A3" />
                <stop offset="100%" stopColor="#FFFFFF" />
              </linearGradient>
            </defs>
            <path
              d="M 88 188 C 190 70, 450 56, 552 104"
              fill="none"
              stroke="url(#udaanMonoArc)"
              strokeWidth="1.8"
              strokeDasharray="5 5"
              opacity="0.55"
            />
            <path
              d="M 88 188 Q 165 110 242 128 T 398 158 T 552 104"
              fill="none"
              stroke="#A3A3A3"
              strokeWidth="2.2"
            />
            {[
              { x: 88, y: 188, color: '#D4D4D4', label: 'Students' },
              { x: 242, y: 128, color: '#A3A3A3', label: 'Universities' },
              { x: 398, y: 158, color: '#E5E5E5', label: 'Companies' },
              { x: 552, y: 104, color: '#FFFFFF', label: 'Opportunities' },
            ].map((pt, idx) => (
              <g key={pt.label} onClick={() => setActiveIndex(idx)} className="cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={activeIndex === idx ? 26 : 20}
                  fill="#171717"
                  stroke={pt.color}
                  strokeWidth={activeIndex === idx ? 2.4 : 1.3}
                />
                <circle cx={pt.x} cy={pt.y} r="5.5" fill={pt.color} />
                <text
                  x={pt.x}
                  y={pt.y + 42}
                  textAnchor="middle"
                  fill={activeIndex === idx ? '#FFFFFF' : '#A3A3A3'}
                  fontSize="12"
                  fontWeight={activeIndex === idx ? '600' : '500'}
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
        )}
      </div>

      {/* Node Selector + Caption Footer */}
      <div className="border-t border-[#242424] bg-[#171717] p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-3">
          {NETWORK_NODES.map((node, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`px-2.5 py-1.5 rounded-[8px] text-xs font-medium text-left transition-colors duration-150 ${
                  isSelected
                    ? 'bg-[#FFFFFF] text-[#090909]'
                    : 'bg-[#202020] text-[#A3A3A3] hover:bg-[#2A2A2A] hover:text-[#FFFFFF]'
                }`}
              >
                {node.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#A3A3A3]">
              {activeNode.role}
            </p>
            <p className="text-xs text-[#E5E5E5] mt-0.5 leading-relaxed">
              {activeNode.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
