import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Icosahedron, Ring, Torus } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

const GlowingSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.15;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={1.5}>
      <Icosahedron ref={meshRef} args={[1.8, 4]} position={[0, 0, 0]}>
        <MeshDistortMaterial
          color="#FFD600"
          emissive="#FFD600"
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.8}
          wireframe
          distort={0.25}
          speed={2}
        />
      </Icosahedron>
    </Float>
  );
};

const OrbitRing = ({ radius, speed, color, opacity }: { radius: number; speed: number; color: string; opacity: number }) => {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = Math.PI / 2 + Math.sin(clock.getElapsedTime() * speed * 0.5) * 0.3;
      ref.current.rotation.z = clock.getElapsedTime() * speed;
    }
  });

  return (
    <Ring ref={ref} args={[radius, radius + 0.02, 128]}>
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </Ring>
  );
};

const FloatingParticles = () => {
  const points = useRef<THREE.Points>(null);

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    for (let i = 0; i < 200; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, []);

  useFrame(({ clock }) => {
    if (points.current) {
      points.current.rotation.y = clock.getElapsedTime() * 0.02;
      points.current.rotation.x = clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={200}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="#FFD600" size={0.03} transparent opacity={0.6} sizeAttenuation />
    </points>
  );
};

const HeroScene = () => {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.8} color="#FFD600" />
        <pointLight position={[-5, -3, 3]} intensity={0.4} color="#666666" />
        <GlowingSphere />
        <OrbitRing radius={2.8} speed={0.3} color="#FFD600" opacity={0.15} />
        <OrbitRing radius={3.2} speed={-0.2} color="#FFD600" opacity={0.08} />
        <OrbitRing radius={3.6} speed={0.15} color="#666666" opacity={0.06} />
        <FloatingParticles />
      </Canvas>
    </div>
  );
};

export default HeroScene;
