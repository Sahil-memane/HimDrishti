import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const ThreePolarScene: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let ship: THREE.Group;
    let ocean: THREE.Mesh;
    let curve: THREE.CatmullRomCurve3;
    const icebergs: THREE.Mesh[] = [];
    const clock = new THREE.Clock();

    const init = () => {
      // 1. Scene & Fog
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x030b17);
      scene.fog = new THREE.FogExp2(0x030b17, 0.02);

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      // 2. Camera & Renderer
      camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Clear container and append canvas
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      container.appendChild(renderer.domElement);

      // 3. Lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 2);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0x00e5ff, 1.5);
      directionalLight.position.set(10, 20, 10);
      scene.add(directionalLight);

      // 4. Ocean Surface
      const oceanGeom = new THREE.PlaneGeometry(2000, 2000);
      const oceanMat = new THREE.MeshStandardMaterial({
        color: 0x07162c,
        roughness: 0.1,
        metalness: 0.8,
      });
      ocean = new THREE.Mesh(oceanGeom, oceanMat);
      ocean.rotation.x = -Math.PI / 2;
      scene.add(ocean);

      // 5. Navigation Spline Path
      curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 100),
        new THREE.Vector3(20, 0, 60),
        new THREE.Vector3(-30, 0, 20),
        new THREE.Vector3(40, 0, -20),
        new THREE.Vector3(-10, 0, -80),
        new THREE.Vector3(0, 0, -150),
      ]);

      // 6. Ship Construction
      const shipGroup = new THREE.Group();

      // Hull
      const hullGeom = new THREE.BoxGeometry(4, 2, 12);
      const hullMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
      const hull = new THREE.Mesh(hullGeom, hullMat);
      shipGroup.add(hull);

      // Bow
      const bowGeom = new THREE.ConeGeometry(2, 4, 4);
      bowGeom.rotateX(-Math.PI / 2);
      bowGeom.scale(1, 0.5, 1);
      const bow = new THREE.Mesh(bowGeom, hullMat);
      bow.position.z = -8;
      shipGroup.add(bow);

      // Superstructure / Cabin
      const cabinGeom = new THREE.BoxGeometry(3, 3, 4);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
      const cabin = new THREE.Mesh(cabinGeom, cabinMat);
      cabin.position.y = 2.5;
      cabin.position.z = 2;
      shipGroup.add(cabin);

      // Cargo Containers
      for (let i = 0; i < 8; i++) {
        const contGeom = new THREE.BoxGeometry(1.5, 1.5, 3);
        const contMat = new THREE.MeshStandardMaterial({
          color: Math.random() > 0.5 ? 0x00daf3 : 0x0a226b,
        });
        const cont = new THREE.Mesh(contGeom, contMat);
        cont.position.set(
          i % 2 === 0 ? 0.8 : -0.8,
          1.7,
          -2 - Math.floor(i / 2) * 1.5
        );
        shipGroup.add(cont);
      }

      ship = shipGroup;
      scene.add(ship);

      // 7. Procedural Icebergs
      for (let i = 0; i < 45; i++) {
        const iceGeom = new THREE.IcosahedronGeometry(
          Math.random() * 8 + 3,
          0
        );
        const iceMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x00e5ff,
          emissiveIntensity: 0.15,
          flatShading: true,
          transparent: true,
          opacity: 0.9,
        });
        const iceberg = new THREE.Mesh(iceGeom, iceMat);

        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 150;
        iceberg.position.x = Math.cos(angle) * radius;
        iceberg.position.z = Math.sin(angle) * radius - 20;
        iceberg.position.y = -2;

        iceberg.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(iceberg);
        icebergs.push(iceberg);
      }
    };

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Scroll progress
      const scrollY = window.scrollY;
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = Math.max(0, Math.min(1, maxScroll > 0 ? scrollY / maxScroll : 0));

      if (curve && ship) {
        const t = scrollPercent;
        const pos = curve.getPointAt(t);
        const lookAtPos = curve.getPointAt(Math.min(t + 0.01, 1));

        ship.position.lerp(pos, 0.1);
        ship.lookAt(lookAtPos);

        // Dynamic Camera Checkpoints
        const targetCamPos = new THREE.Vector3();

        if (t < 0.2) {
          // Hero Checkpoint (Behind ship)
          targetCamPos.set(pos.x, pos.y + 15, pos.z + 35);
        } else if (t < 0.5) {
          // How it Works Checkpoint (Top-down tactical view)
          targetCamPos.set(pos.x, pos.y + 60, pos.z);
        } else if (t < 0.8) {
          // Features Checkpoint (Cinematic side-view)
          targetCamPos.set(pos.x + 40, pos.y + 20, pos.z + 10);
        } else {
          // Final CTA Checkpoint (Wide departure)
          targetCamPos.set(pos.x - 30, pos.y + 15, pos.z - 50);
        }

        camera.position.lerp(targetCamPos, 0.05);
        camera.lookAt(ship.position);
      }

      // Gentle Ship Floating Pitch/Tilt
      const time = clock.getElapsedTime();
      if (ship) {
        ship.position.y += Math.sin(time * 0.5) * 0.005;
      }

      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      if (!container || !camera || !renderer) return;
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    init();
    animate();

    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer && renderer.domElement) {
        renderer.domElement.remove();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
      <div ref={containerRef} className="w-full h-full bg-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#121318]/80 via-transparent to-[#121318]/90" />
    </div>
  );
};
