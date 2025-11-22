import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import * as THREE from 'three';

const Login = () => {
    const navigate = useNavigate();
    const { login, resendVerification } = useAuth();

    // State
    const [loading, setLoading] = useState(false);
    const [credentials, setCredentials] = useState({
        identifier: '',
        password: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [userType, setUserType] = useState('faculty');
    const [errorMessage, setError] = useState('');
    const [showNotification, setShowNotification] = useState(false);
    const [notificationType, setNotificationType] = useState('error');
    const [unverifiedEmail, setUnverifiedEmail] = useState('');
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [showPasswordChangeRequired, setShowPasswordChangeRequired] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [showAppPopup, setShowAppPopup] = useState(true);

    // Refs for Three.js cleanup
    const mountRef = useRef(null);

    // ----------------------------------------------------------------
    // LOGIC: Effects and Handlers
    // ----------------------------------------------------------------

    useEffect(() => {
        if (showAppPopup) {
            const timer = setTimeout(() => {
                setShowAppPopup(false);
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [showAppPopup]);

    useEffect(() => {
        if (!mountRef.current) return;

        const container = mountRef.current;
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0f172a, 0.002);

        const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.z = 30;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        container.appendChild(renderer.domElement);

        // Particles
        const geometry = new THREE.BufferGeometry();
        const count = 2000;
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 100;
            colors[i] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // Connecting Lines
        const lineGeometry = new THREE.IcosahedronGeometry(15, 1);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const mesh = new THREE.Mesh(lineGeometry, lineMaterial);
        scene.add(mesh);

        // Floating Shapes
        const shapes = [];
        const shapeGeo = new THREE.IcosahedronGeometry(1, 0);
        const shapeMat = new THREE.MeshPhongMaterial({
            color: 0x818cf8,
            shininess: 100,
            flatShading: true
        });

        for (let i = 0; i < 15; i++) {
            const shape = new THREE.Mesh(shapeGeo, shapeMat);
            shape.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
            shape.scale.setScalar(Math.random() * 2 + 0.5);
            scene.add(shape);
            shapes.push({
                mesh: shape,
                rotSpeed: Math.random() * 0.02,
                yOffset: Math.random() * Math.PI * 2
            });
        }

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        const pointLight = new THREE.PointLight(0x6366f1, 2, 50);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);

        let mouseX = 0, mouseY = 0;
        const windowHalfX = container.clientWidth / 2;
        const windowHalfY = container.clientHeight / 2;

        const handleMouseMove = (event) => {
            mouseX = (event.clientX - windowHalfX);
            mouseY = (event.clientY - windowHalfY);
        };
        document.addEventListener('mousemove', handleMouseMove);

        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            particles.rotation.y += 0.001;
            particles.rotation.x += 0.0005;
            mesh.rotation.y -= 0.002;
            mesh.rotation.x -= 0.001;
            camera.position.x += (mouseX * 0.01 - camera.position.x) * 0.05;
            camera.position.y += (-mouseY * 0.01 - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            shapes.forEach(item => {
                item.mesh.rotation.x += item.rotSpeed;
                item.mesh.rotation.y += item.rotSpeed;
                item.mesh.position.y += Math.sin(Date.now() * 0.001 + item.yOffset) * 0.02;
            });

            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (!container) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousemove', handleMouseMove);
            cancelAnimationFrame(animationId);
            if (container && renderer.domElement) {
                container.removeChild(renderer.domElement);
            }
            geometry.dispose();
            material.dispose();
            lineGeometry.dispose();
            lineMaterial.dispose();
            renderer.dispose();
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowNotification(false);
        setShowVerificationMessage(false);
        setVerificationSent(false);
        setShowPasswordChangeRequired(false);

        try {
            const result = await login(credentials.identifier, credentials.password);

            if (result.isVerified === false) {
                setUnverifiedEmail(result.email);
                setShowVerificationMessage(true);
                setLoading(false);
                return;
            }

            if (result.passwordChangeRequired) {
                setUserEmail(credentials.email);
                setShowPasswordChangeRequired(true);
                setLoading(false);
                return;
            }

            const user = result.userData;

            if (userType === 'faculty' && user.role !== 'faculty') {
                throw new Error('Access denied. This login is for faculty only.');
            }

            if (userType === 'student' && user.role !== 'student') {
                throw new Error('Access denied. This login is for students only.');
            }

            if (user.role === 'student' && (!user.course || !user.section || !user.classRollNumber)) {
                throw new Error('Your profile is missing required information. Please contact your administrator.');
            }

            if (user.role === 'faculty') {
                navigate('/faculty');
            } else {
                navigate('/student');
            }
        } catch (err) {
            setError(err.message || 'Invalid credentials or access denied');
            setShowNotification(true);
            setNotificationType('error');
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        try {
            setLoading(true);
            await resendVerification(unverifiedEmail);
            setVerificationSent(true);
            setLoading(false);
        } catch (err) {
            setError(err.message || 'Failed to resend verification email');
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
          background-color: #0f172a;
          overflow: hidden; 
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #0f172a inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
          z-index: 1;
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); }
          50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.2); border-color: rgba(99, 102, 241, 0.6); }
        }

        @keyframes slide-in-down {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-slide-in {
          animation: slide-in-down 0.3s ease-out forwards;
        }

        .input-focus-glow:focus-within {
          animation: pulse-glow 2s infinite;
        }
      `}</style>

            {showAppPopup && (
                <div className="fixed bottom-5 right-5 z-[110] animate-bounce-in">
                    <div className="bg-[#1e293b] border border-indigo-500/30 p-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-md">
                        <div className="bg-indigo-600/20 p-3 rounded-full text-indigo-400">
                            <i className="fas fa-mobile-alt text-xl"></i>
                        </div>
                        <div className="flex-1">
                            <p className="text-slate-200 text-sm"><strong>Get the Android App!</strong> Mark attendance faster on the go.</p>
                            <div className="mt-2 flex gap-3">
                                <a href="https://www.mediafire.com/file/pvt2uk423u4uxyz/QuickRoll-release_5.apk/file" target="_blank" rel="noopener noreferrer" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg transition-colors font-semibold">
                                    Download Now
                                </a>
                                <button onClick={() => setShowAppPopup(false)} className="text-xs text-slate-400 hover:text-white transition-colors">
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 w-full h-full flex bg-[#0f172a] text-white antialiased selection:bg-indigo-500 selection:text-white overflow-hidden z-[100]">

                {/* Left Side: Form */}
                <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-6 lg:px-8 bg-[#0f172a] z-20 shadow-2xl relative h-full">

                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none"></div>

                    <div className="glass-panel w-full max-w-[420px] rounded-2xl p-6 md:p-8 relative overflow-hidden z-10">

                        {/* Logo Section */}
                        <div className="relative z-10 text-center mb-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                                <img src="/Logo.ico" alt="QuickRoll Logo" className="w-18 h-18 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                                QuickRoll
                            </h1>
                            <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase opacity-80">Secure Access Portal</p>
                        </div>

                        {/* UPGRADED NOTIFICATION UI */}
                        {showNotification && (
                            <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-4 animate-slide-in backdrop-blur-md shadow-lg border ${notificationType === 'success'
                                ? 'bg-emerald-500/10 border-emerald-500/20'
                                : 'bg-red-500/10 border-red-500/20'
                                }`}>
                                {/* Glowing Icon Container */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notificationType === 'success'
                                    ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                    : 'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]'
                                    }`}>
                                    <i className={`fas ${notificationType === 'success' ? 'fa-check' : 'fa-exclamation'} text-sm`}></i>
                                </div>

                                {/* Message Text */}
                                <div className={`flex-1 text-xs font-medium leading-relaxed ${notificationType === 'success' ? 'text-emerald-100' : 'text-red-100'
                                    }`}>
                                    {errorMessage}
                                </div>

                                {/* Close Button */}
                                <button
                                    onClick={() => setShowNotification(false)}
                                    className={`shrink-0 p-1 rounded-lg transition-colors ${notificationType === 'success'
                                        ? 'text-emerald-400 hover:bg-emerald-500/20'
                                        : 'text-red-400 hover:bg-red-500/20'
                                        }`}
                                >
                                    <i className="fas fa-times text-xs block"></i>
                                </button>
                            </div>
                        )}

                        {showPasswordChangeRequired ? (
                            <div className="text-center space-y-5">
                                <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-xl">
                                    <i className="fas fa-exclamation-circle text-3xl text-yellow-500 mb-3"></i>
                                    <h3 className="text-lg font-bold text-white mb-2">Password Change Required</h3>
                                    <p className="text-slate-400 text-xs mb-5">For security reasons, you need to change your password before accessing your account.</p>
                                    <div className="space-y-2.5">
                                        <button
                                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold transition-all text-sm"
                                            onClick={() => navigate('/forgot-password', { state: { email: userEmail, passwordChangeRequired: true } })}
                                        >
                                            Change Password
                                        </button>
                                        <button
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium transition-all text-sm"
                                            onClick={() => setShowPasswordChangeRequired(false)}
                                        >
                                            Back to Login
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : showVerificationMessage ? (
                            <div className="text-center space-y-5">
                                <div className={`p-5 rounded-xl border ${verificationSent ? "bg-green-500/10 border-green-500/20" : "bg-yellow-500/10 border-yellow-500/20"}`}>
                                    <i className={`fas ${verificationSent ? 'fa-check-circle text-green-500' : 'fa-exclamation-triangle text-yellow-500'} text-3xl mb-3`}></i>
                                    <h3 className="text-lg font-bold text-white mb-2">
                                        {verificationSent ? 'Verification Email Sent!' : 'Email Not Verified'}
                                    </h3>
                                    <p className="text-slate-400 text-xs mb-5">
                                        {verificationSent
                                            ? `A new verification email has been sent to ${unverifiedEmail}. Please check your inbox.`
                                            : `Your email ${unverifiedEmail} has not been verified yet.`
                                        }
                                    </p>

                                    <div className="space-y-2.5">
                                        {!verificationSent && (
                                            <button
                                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                                onClick={handleResendVerification}
                                                disabled={loading}
                                            >
                                                {loading ? 'Sending...' : 'Resend Verification Email'}
                                            </button>
                                        )}
                                        <button
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl font-medium transition-all text-sm"
                                            onClick={() => { setShowVerificationMessage(false); setVerificationSent(false); }}
                                        >
                                            Back to Login
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="relative z-10 space-y-5">

                                <div className="grid grid-cols-2 gap-2 bg-[#0f172a]/60 p-1 rounded-xl border border-white/10 mb-4">
                                    <button
                                        type="button"
                                        className={`col-span-2 py-2 rounded-lg text-sm font-bold transition-all ${userType === 'faculty' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                                        onClick={() => setUserType('faculty')}
                                    >
                                        Faculty Login
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                                        {userType === 'student' ? 'Student ID' : 'Email Address'}
                                    </label>
                                    <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                                            <i className={`fa-regular ${userType === 'student' ? 'fa-id-card' : 'fa-envelope'} text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors`}></i>
                                        </div>
                                        <input
                                            type={userType === 'student' ? 'text' : 'email'}
                                            value={credentials.identifier}
                                            onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                                            className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                                            placeholder={userType === 'student' ? "Enter Student ID" : "name@graphicera.edu"}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                                            <i className="fa-solid fa-lock text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                                        </div>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={credentials.password}
                                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                            className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 pr-12 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer focus:outline-none bg-transparent z-10"
                                        >
                                            <i className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-lg`}></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <label className="flex items-center cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded border-slate-600 bg-slate-800/50 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0 transition-all cursor-pointer" />
                                        <span className="ml-2 text-xs font-medium text-slate-400 group-hover:text-slate-300 transition-colors">Remember me</span>
                                    </label>
                                    <Link to="/forgot-password" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                                        Forgot password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex justify-center items-center gap-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    <span>{loading ? 'Signing In...' : 'Sign In'}</span>
                                    {!loading && <i className="fa-solid fa-arrow-right transition-transform group-hover:translate-x-1 text-sm"></i>}
                                </button>

                            </form>
                        )}

                        {!showVerificationMessage && !showPasswordChangeRequired && (
                            <div className="mt-6 text-center relative z-10">
                                <p className="text-slate-500 text-xs font-medium">
                                    {userType === 'student' ? (
                                        <>New user? <span className="text-slate-400 cursor-not-allowed">Creating Account is disabled!</span></>
                                    ) : (
                                        <>Don't have an account? <Link to="/faculty-request" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Request Access</Link></>
                                    )}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="hidden lg:block w-[55%] relative bg-[#0f172a] overflow-hidden h-full">
                    <div ref={mountRef} id="canvas-container" className="absolute inset-0 w-full h-full"></div>

                    <div className="absolute bottom-0 left-0 w-full px-16 py-16 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent z-10 pointer-events-none">
                        <h2 className="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Next Gen<br />Attendance</h2>
                        <p className="text-slate-400 text-xl max-w-xl leading-relaxed font-light">
                            Experience seamless, efficient, and secure attendance management.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Login;