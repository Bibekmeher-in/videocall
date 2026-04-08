import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

function OrbField() {
    const groupRef = useRef(null);

    const orbs = useMemo(() => {
        return Array.from({ length: 14 }).map((_, index) => ({
            id: index,
            position: [
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 8,
                (Math.random() - 0.5) * 8
            ],
            scale: 0.35 + Math.random() * 0.7,
            speed: 0.35 + Math.random() * 0.8,
            color: ['#37b0ff', '#73f7c7', '#7d7bff', '#a9f3ff'][index % 4]
        }));
    }, []);

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.06;
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.07;
    });

    return (
        <group ref={groupRef}>
            {orbs.map((orb) => (
                <Float key={orb.id} speed={orb.speed} rotationIntensity={0.8} floatIntensity={1.4}>
                    <mesh position={orb.position} scale={orb.scale}>
                        <icosahedronGeometry args={[1, 2]} />
                        <MeshDistortMaterial
                            color={new THREE.Color(orb.color)}
                            roughness={0.12}
                            metalness={0.2}
                            distort={0.36}
                            speed={1.6}
                            transparent
                            opacity={0.52}
                        />
                    </mesh>
                </Float>
            ))}
        </group>
    );
}

export default function ThreeBackground() {
    const [renderError, setRenderError] = useState(false);

    const handleCanvasCreated = (state) => {
        if (state.gl) {
            const canvas = state.gl.domElement;
            const handleContextLost = () => {
                console.warn('WebGL context lost - attempting to restore');
                setRenderError(true);
            };
            const handleContextRestored = () => {
                console.warn('WebGL context restored');
                setRenderError(false);
            };
            canvas.addEventListener('webglcontextlost', handleContextLost);
            canvas.addEventListener('webglcontextrestored', handleContextRestored);

            return () => {
                canvas.removeEventListener('webglcontextlost', handleContextLost);
                canvas.removeEventListener('webglcontextrestored', handleContextRestored);
            };
        }
    };

    if (renderError) {
        return <div className="three-stage bg-gradient-to-br from-slate-900 to-slate-950" aria-hidden />;
    }

    return (
        <div className="three-stage" aria-hidden>
            <Canvas
                camera={{ position: [0, 0, 8.5], fov: 50 }}
                dpr={[1, 1.7]}
                onCreated={handleCanvasCreated}
                gl={{ preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true }}
            >
                <color attach="background" args={['#050b1a']} />
                <fog attach="fog" args={['#050b1a', 8, 22]} />
                <ambientLight intensity={0.6} />
                <pointLight position={[4, 5, 4]} intensity={3.2} color="#53a3ff" />
                <pointLight position={[-5, -2, -3]} intensity={2.8} color="#45ffc4" />
                <Stars radius={55} depth={40} count={1400} factor={3.2} saturation={0} fade speed={0.6} />
                <OrbField />
            </Canvas>
        </div>
    );
}
