import React, { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Line, Stars, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const GLOBE_NATIVE_RADIUS = 1.0;

const Earth = () => {
  const { scene } = useGLTF('/models/earth_globe_gltf/scene.gltf');
  return <primitive object={scene} />;
};

const toVec3 = (lat: number, lon: number, altitude: number = 0) => {
  const r = GLOBE_NATIVE_RADIUS + altitude;
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(r * Math.sin(phi) * Math.cos(theta));
  const z = (r * Math.sin(phi) * Math.sin(theta));
  const y = (r * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
};

const MonitoringRings = () => {
  return (
    <group>
      <mesh position={[0, GLOBE_NATIVE_RADIUS * Math.sin(-60 * Math.PI / 180), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GLOBE_NATIVE_RADIUS * Math.cos(-60 * Math.PI / 180) + 0.01, GLOBE_NATIVE_RADIUS * Math.cos(-60 * Math.PI / 180) + 0.02, 64]} />
        <meshBasicMaterial color="#00daf3" transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, GLOBE_NATIVE_RADIUS * Math.sin(-75 * Math.PI / 180), 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GLOBE_NATIVE_RADIUS * Math.cos(-75 * Math.PI / 180) + 0.01, GLOBE_NATIVE_RADIUS * Math.cos(-75 * Math.PI / 180) + 0.02, 64]} />
        <meshBasicMaterial color="#aee9ff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const RouteLine = () => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const lat = -70 + Math.sin(t * Math.PI) * 10;
    const lon = t * 140 - 70;
    points.push(toVec3(lat, lon, 0.01));
  }
  return <Line points={points} color="#39ff14" lineWidth={2} dashed={false} />;
};

const RouteLine2 = () => {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    const lat = -65 - t * 15;
    const lon = 80 - t * 60;
    points.push(toVec3(lat, lon, 0.01));
  }
  return <Line points={points} color="#aee9ff" lineWidth={2} dashed={true} dashScale={5} dashSize={2} dashOffset={0} />;
};

const Waypoints = () => {
  return (
    <group>
      <mesh position={toVec3(-70, -70, 0.02)}><sphereGeometry args={[0.015, 16, 16]} /><meshBasicMaterial color="#39ff14" /></mesh>
      <mesh position={toVec3(-70, 70, 0.02)}><sphereGeometry args={[0.015, 16, 16]} /><meshBasicMaterial color="#39ff14" /></mesh>
      <mesh position={toVec3(-65, 80, 0.02)}><sphereGeometry args={[0.012, 16, 16]} /><meshBasicMaterial color="#aee9ff" /></mesh>
      <mesh position={toVec3(-80, 20, 0.02)}><sphereGeometry args={[0.012, 16, 16]} /><meshBasicMaterial color="#aee9ff" /></mesh>
      <mesh position={toVec3(-77.8, 166.6, 0.02)}><sphereGeometry args={[0.02, 16, 16]} /><meshBasicMaterial color="#ffb4ab" /></mesh>
      <mesh position={toVec3(-77.8, 166.6, 0.02)}><ringGeometry args={[0.025, 0.035, 32]} /><meshBasicMaterial color="#ffb4ab" transparent opacity={0.8} side={THREE.DoubleSide} /></mesh>
    </group>
  );
};

const InteractiveGlobe = () => {
  const { viewport } = useThree();
  const innerGroupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!isDragging.current && innerGroupRef.current) {
      innerGroupRef.current.rotation.y += delta * 0.05; // Slow polar rotation
    }
  });

  const onPointerDown = (e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    previousMouse.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = () => { isDragging.current = false; };
  const onPointerOut = () => { isDragging.current = false; };

  const onPointerMove = (e: any) => {
    if (isDragging.current && innerGroupRef.current) {
      e.stopPropagation();
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      
      // Map horizontal drag strictly to polar Y axis rotation
      innerGroupRef.current.rotation.y += deltaX * 0.005;
      
      // Add very slight manual tilt on vertical drag, clamped to prevent breaking Antarctica focus
      const newX = innerGroupRef.current.rotation.x + deltaY * 0.005;
      innerGroupRef.current.rotation.x = THREE.MathUtils.clamp(newX, -0.3, 0.3);
      
      previousMouse.current = { x: e.clientX, y: e.clientY };
    }
  };

  // Responsive Math: Position the globe perfectly on the right half of the screen
  const isMobile = viewport.width < 7;
  const targetX = isMobile ? 0 : viewport.width / 4;
  const targetY = isMobile ? -viewport.height / 4 : 0;
  
  // Calculate scale based on viewport to ensure it fills the space beautifully
  const targetScale = isMobile ? viewport.width * 0.45 : viewport.width * 0.25;
  const finalScale = Math.min(targetScale, 4.0); // Cap max size

  return (
    <group 
      position={[targetX, targetY, 0]} 
      scale={finalScale} 
      rotation={[-Math.PI / 2 + 0.3, 0, 0]} 
    >
      <mesh visible={false} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerOut={onPointerOut} onPointerMove={onPointerMove}>
        <sphereGeometry args={[GLOBE_NATIVE_RADIUS * 1.1, 32, 32]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      <group ref={innerGroupRef}>
        <Earth />
        <MonitoringRings />
        <RouteLine />
        <RouteLine2 />
        <Waypoints />
      </group>
    </group>
  );
};

export const GlobeWidget: React.FC = () => {
  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 40 }}
      style={{ background: 'transparent', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} color="#aee9ff" />
      <directionalLight position={[5, 3, 5]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[-5, -10, 5]} intensity={2} color="#aee9ff" /> 
      <directionalLight position={[0, 0, -10]} intensity={1.5} color="#00daf3" />

      <Stars radius={10} depth={50} count={1500} factor={4} saturation={0} fade speed={0.5} />
      
      <InteractiveGlobe />
    </Canvas>
  );
};
