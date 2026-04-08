import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial, Stars, TorusKnot } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';

function HomeObjects() {
    const groupRef = useRef(null);
    const nodes = useMemo(() => Array.from({ length: 10 }).map((_, i) => ({
        id: i,
        pos: [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 7],
        color: ['#73f7c7', '#7d7bff', '#37b0ff'][i % 3],
        scale: 0.3 + Math.random() * 0.6
    })), []);

    useFrame((state) => {
        if (!groupRef.current) return;
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    });

    return (
        <group ref={groupRef}>
            <Float speed={1.2} rotationIntensity={0.8}>
                <TorusKnot args={[1.3, 0.32, 120, 16]} position={[0, 0.5, -0.5]}>
                    <MeshDistortMaterial color="#7d7bff" distort={0.3} speed={1.4} roughness={0.2} metalness={0.45} transparent opacity={0.32} />
                </TorusKnot>
            </Float>
            {nodes.map((n) => (
                <Float key={n.id} speed={1 + (n.id % 3) * 0.3} floatIntensity={1.3}>
                    <mesh position={n.pos} scale={n.scale}>
                        <icosahedronGeometry args={[1, 1]} />
                        <meshStandardMaterial color={n.color} transparent opacity={0.35} roughness={0.3} metalness={0.3} />
                    </mesh>
                </Float>
            ))}
        </group>
    );
}

function ChatObjects() {
    const meshRef = useRef(null);
    useFrame((state) => {
        if (!meshRef.current) return;
        meshRef.current.rotation.z = state.clock.elapsedTime * 0.12;
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
    });

    return (
        <group>
            <mesh ref={meshRef} position={[1.2, -0.3, -1]}>
                <torusGeometry args={[1.4, 0.24, 24, 150]} />
                <meshStandardMaterial color="#37b0ff" transparent opacity={0.25} roughness={0.35} metalness={0.35} />
            </mesh>
            <Float speed={1.1} floatIntensity={1.2}>
                <mesh position={[-2.5, 1.4, -2]}>
                    <sphereGeometry args={[0.9, 32, 32]} />
                    <MeshDistortMaterial color="#73f7c7" distort={0.42} speed={1.8} transparent opacity={0.3} />
                </mesh>
            </Float>
            <Float speed={1.5} floatIntensity={1.5}>
                <mesh position={[2.6, 1.8, -2.5]}>
                    <octahedronGeometry args={[0.72, 0]} />
                    <meshStandardMaterial color="#7d7bff" transparent opacity={0.35} />
                </mesh>
            </Float>
        </group>
    );
}

export default function PageScene3D({ variant = 'home' }) {
    const [renderError, setRenderError] = useState(false);

    const handleCanvasCreated = (state) => {
        // Add context lost event handler
        if (state.gl) {
            const canvas = state.gl.domElement;
            const handleContextLost = () => {
                console.warn('WebGL context lost - attempting to restore');
                setRenderError(true);
                // Browser will trigger context restoration automatically
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
        return (
            <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-slate-900 to-slate-950" />
        );
    }

    return (
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
            <Canvas
                camera={{ position: [0, 0, 7.2], fov: 52 }}
                dpr={[1, 1.6]}
                onCreated={handleCanvasCreated}
                gl={{ preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: true }}
            >
                <ambientLight intensity={0.55} />
                <pointLight position={[4, 3, 4]} intensity={2.1} color="#62d0ff" />
                <pointLight position={[-4, -2, 1]} intensity={1.5} color="#88ffda" />
                <Stars radius={38} depth={26} count={700} factor={2.7} saturation={0} fade speed={0.6} />
                {variant === 'chat' ? <ChatObjects /> : <HomeObjects />}
            </Canvas>
        </div>
    );
}
