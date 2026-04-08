import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallStore } from '../context/store';
import socketService from '../socket/socket';
import { FaPhone, FaVideo, FaTimes } from 'react-icons/fa';
import { requestCallStartPermissions } from '../utils/callPermissionGate';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';

function Popup3DScene() {
    return (
        <div className="absolute inset-0 pointer-events-none">
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }} dpr={[1, 1.5]}>
                <ambientLight intensity={0.65} />
                <pointLight position={[2.5, 2.5, 2]} intensity={2} color="#67d6ff" />
                <Float speed={1.5} rotationIntensity={0.8} floatIntensity={1.2}>
                    <mesh position={[-1.1, 0.7, 0]}>
                        <icosahedronGeometry args={[0.75, 2]} />
                        <MeshDistortMaterial color="#7d7bff" distort={0.35} speed={2} transparent opacity={0.5} />
                    </mesh>
                </Float>
                <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.3}>
                    <mesh position={[1.2, -0.8, -0.3]}>
                        <sphereGeometry args={[0.52, 32, 32]} />
                        <MeshDistortMaterial color="#57f2cb" distort={0.45} speed={1.8} transparent opacity={0.44} />
                    </mesh>
                </Float>
            </Canvas>
        </div>
    );
}

function CallPopup() {
    const navigate = useNavigate();
    const { incomingCall, callStatus, setIncomingCall, setCallStatus, setCallAcceptedAt, resetCall } = useCallStore();
    const [permissionError, setPermissionError] = useState('');
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        if (incomingCall && callStatus === 'ringing') {
            // Auto-dismiss after 30 seconds
            const timeout = setTimeout(() => {
                handleReject();
            }, 30000);

            return () => clearTimeout(timeout);
        }
    }, [incomingCall, callStatus]);

    const handleAccept = async () => {
        setPermissionError('');
        setAccepting(true);

        const permissionResult = await requestCallStartPermissions({ callType: incomingCall.callType });
        if (!permissionResult.granted) {
            setPermissionError(permissionResult.message || 'Permission denied.');
            setAccepting(false);
            return;
        }

        if (!incomingCall.isGroupCall) {
            socketService.acceptCall(incomingCall.callerId, incomingCall.roomId);
        } else {
            setCallAcceptedAt(Date.now());
            setCallStatus('connected');
        }
        setIncomingCall(null);

        const groupQuery = incomingCall.isGroupCall
            ? `&group=true&groupId=${incomingCall.groupId || ''}`
            : '';
        navigate(`/call/${incomingCall.roomId}?type=${incomingCall.callType}${groupQuery}`);
        setAccepting(false);
    };

    const handleReject = () => {
        if (!incomingCall.isGroupCall) {
            socketService.rejectCall(incomingCall.callerId, incomingCall.roomId);
        }
        resetCall();
    };

    return (
        <AnimatePresence>
            {incomingCall && callStatus === 'ringing' && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 30, rotateX: -16, scale: 0.92 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 24, scale: 0.94 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        whileHover={{ rotateX: 2, rotateY: -2, scale: 1.01 }}
                        style={{ transformStyle: 'preserve-3d' }}
                        className="relative overflow-hidden rounded-3xl w-[92vw] max-w-[22rem] p-4 sm:p-6 border border-cyan-200/30 shadow-[0_22px_70px_rgba(2,12,34,0.65)] bg-slate-950/55"
                    >
                        <Popup3DScene />
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/15 via-transparent to-indigo-500/25 pointer-events-none" />
                        <div className="relative z-10 flex flex-col items-center">
                            <motion.div
                                animate={{ y: [0, -6, 0], boxShadow: ['0 0 0 rgba(34,211,238,0.25)', '0 0 30px rgba(34,211,238,0.45)', '0 0 0 rgba(34,211,238,0.25)'] }}
                                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900/60 border border-cyan-200/35 flex items-center justify-center mb-4 overflow-hidden"
                            >
                                {incomingCall.callerAvatar ? (
                                    <img
                                        src={incomingCall.callerAvatar}
                                        alt={incomingCall.callerName}
                                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                                    />
                                ) : (
                                    <span className="text-3xl sm:text-4xl font-bold text-cyan-100">
                                        {incomingCall.callerName?.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </motion.div>

                            <h3 className="text-lg sm:text-xl font-semibold mb-1 text-cyan-50 text-center break-all">{incomingCall.callerName}</h3>
                            <p className="text-cyan-100/80 text-sm mb-4 text-center">
                                {incomingCall.isGroupCall
                                    ? `Incoming ${incomingCall.callType === 'video' ? 'group video' : 'group audio'} call${incomingCall.groupName ? ` in ${incomingCall.groupName}` : ''}...`
                                    : (incomingCall.callType === 'video' ? 'Incoming video call...' : 'Incoming audio call...')}
                            </p>
                            {permissionError && (
                                <p className="text-red-300 text-xs mb-3 text-center">{permissionError}</p>
                            )}

                            {/* Call Actions */}
                            <div className="flex items-center justify-center gap-5 sm:gap-8">
                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={handleReject}
                                    className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-600/35"
                                >
                                    <FaTimes className="w-6 h-6" />
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.08 }}
                                    whileTap={{ scale: 0.94 }}
                                    onClick={handleAccept}
                                    disabled={accepting}
                                    className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-600/35 disabled:opacity-60"
                                >
                                    {incomingCall.callType === 'video' ? (
                                        <FaVideo className="w-6 h-6" />
                                    ) : (
                                        <FaPhone className="w-6 h-6" />
                                    )}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default CallPopup;
