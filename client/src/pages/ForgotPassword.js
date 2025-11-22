import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import * as THREE from 'three';

const ForgotPassword = () => {
  // ---------------------------------------------------
  // 1. STATE & LOGIC (Preserved from original)
  // ---------------------------------------------------
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState('email'); // 'email', 'verification', 'reset'
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isStudent, setIsStudent] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('error');
  const [notificationMessage, setNotificationMessage] = useState('');
  const navigate = useNavigate();
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [codeExpiresIn, setCodeExpiresIn] = useState(600);

  const mountRef = useRef(null);

  // Helper: Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Notifications
  const showNotificationMessage = (message, type = 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  // Effects
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setInterval(() => {
        setCooldownTime((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldownTime]);

  useEffect(() => {
    if (step === 'verification' && codeExpiresIn > 0) {
      const timer = setInterval(() => {
        setCodeExpiresIn((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setError('Verification code has expired. Please request a new one.');
            showNotificationMessage('Verification code has expired. Please request a new one.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, codeExpiresIn]);

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
      if (location.state?.passwordChangeRequired) {
        const submitEmailForm = async () => {
          setIsLoading(true);
          try {
            const response = await authAPI.forgotPassword(location.state.email);
            if (response.role === 'student') {
              setIsStudent(true);
              setStep('verification');
              setMessage(response.message);
              showNotificationMessage(response.message, 'info');
            } else if (response.role === 'faculty') {
              setSuccess(true);
              setMessage(response.message);
              showNotificationMessage(response.message, 'success');
              setTimeout(() => navigate('/faculty-reset-password', { state: { email, userId: response.userId } }), 2000);
            }
          } catch (err) {
            const errorMessage = err.message || 'Failed to process request';
            setError(errorMessage);
            showNotificationMessage(errorMessage, 'error');
          } finally {
            setIsLoading(false);
          }
        };
        submitEmailForm();
      }
    }
  }, [location.state]);

  // Handlers
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError(''); setMessage('');
    try {
      const response = await authAPI.forgotPassword(email);
      if (response.role === 'faculty') {
        setSuccess(true);
        setMessage(response.message);
        showNotificationMessage(response.message, 'success');
        setTimeout(() => navigate('/faculty-reset-password', { state: { email, userId: response.userId } }), 2000);
      } else if (response.role === 'student') {
        setIsStudent(true);
        setStep('verification');
        setMessage(response.message);
        showNotificationMessage(response.message, 'info');
        if (response.cooldownPeriod) setCooldownTime(response.cooldownPeriod);
        if (response.expiresIn) setCodeExpiresIn(response.expiresIn);
      }
    } catch (err) {
      const errorMessage = err.message || 'Failed to process request';
      setError(errorMessage);
      showNotificationMessage(errorMessage, 'error');
      if (err.cooldown && err.retryAfter) setCooldownTime(err.retryAfter);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    if (verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit verification code');
      showNotificationMessage('Please enter a valid 6-digit verification code', 'error');
      setIsLoading(false);
      return;
    }
    try {
      const response = await authAPI.verifyCode({ email, code: verificationCode });
      showNotificationMessage('Verification code is valid', 'success');
      if (response.remainingAttempts !== undefined) setRemainingAttempts(response.remainingAttempts);
      setStep('reset');
    } catch (err) {
      const errorMessage = err.message || 'Invalid verification code';
      setError(errorMessage);
      showNotificationMessage(errorMessage, 'error');
      if (err.attemptsExceeded) {
        setStep('email');
        setVerificationCode('');
        setRemainingAttempts(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError('');
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      showNotificationMessage('Password must be at least 6 characters', 'error');
      setIsLoading(false); return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      showNotificationMessage('Passwords do not match', 'error');
      setIsLoading(false); return;
    }
    try {
      await authAPI.resetPassword({ email, code: verificationCode, newPassword });
      setSuccess(true);
      setMessage('Password reset successful! You can now login with your new password.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to reset password';
      setError(errorMessage);
      showNotificationMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------
  // 2. THREE.JS EFFECT
  // ---------------------------------------------------
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
    while (container.firstChild) container.removeChild(container.firstChild);
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
    const material = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Lines & Shapes
    const lineGeometry = new THREE.IcosahedronGeometry(15, 1);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.15 });
    const mesh = new THREE.Mesh(lineGeometry, lineMaterial);
    scene.add(mesh);

    const shapes = [];
    const shapeGeo = new THREE.IcosahedronGeometry(1, 0);
    const shapeMat = new THREE.MeshPhongMaterial({ color: 0x818cf8, shininess: 100, flatShading: true });
    for (let i = 0; i < 15; i++) {
      const shape = new THREE.Mesh(shapeGeo, shapeMat);
      shape.position.set((Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60);
      shape.scale.setScalar(Math.random() * 2 + 0.5);
      scene.add(shape);
      shapes.push({ mesh: shape, rotSpeed: Math.random() * 0.02, yOffset: Math.random() * Math.PI * 2 });
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x6366f1, 2, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Animation
    let mouseX = 0, mouseY = 0;
    const handleMouseMove = (e) => {
      const windowHalfX = container.clientWidth / 2;
      const windowHalfY = container.clientHeight / 2;
      mouseX = (e.clientX - windowHalfX);
      mouseY = (e.clientY - windowHalfY);
    };
    document.addEventListener('mousemove', handleMouseMove);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      particles.rotation.y += 0.001;
      mesh.rotation.y -= 0.002;
      camera.position.x += (mouseX * 0.01 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 0.01 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);
      shapes.forEach(item => {
        item.mesh.rotation.x += item.rotSpeed;
        item.mesh.position.y += Math.sin(Date.now() * 0.001 + item.yOffset) * 0.02;
      });
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
      if (container && renderer.domElement) container.removeChild(renderer.domElement);
      geometry.dispose(); material.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f172a; overflow: hidden; }
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 30px #0f172a inset !important; -webkit-text-fill-color: white !important; transition: background-color 5000s ease-in-out 0s; z-index: 1; }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); } 50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.2); border-color: rgba(99, 102, 241, 0.6); } }
        @keyframes slide-in-down { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slide-in-down 0.3s ease-out forwards; }
        .input-focus-glow:focus-within { animation: pulse-glow 2s infinite; }
      `}</style>

      <div className="fixed inset-0 w-full h-full flex bg-[#0f172a] text-white overflow-hidden z-[100]">

        {/* LEFT PANEL */}
        <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-6 lg:px-8 bg-[#0f172a] z-20 shadow-2xl relative h-full">

          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none"></div>

          <div className="glass-panel w-full max-w-[420px] rounded-2xl p-6 md:p-8 relative overflow-hidden z-10">

            {/* HEADER */}
            <div className="relative z-10 text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                <i className="fa-solid fa-lock-open text-3xl text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"></i>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                {step === 'email' ? 'Forgot Password' : step === 'verification' ? 'Verify Code' : 'Reset Password'}
              </h1>
              <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase opacity-80">Account Recovery</p>
            </div>

            {/* NOTIFICATION UI */}
            {showNotification && (
              <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-4 animate-slide-in backdrop-blur-md shadow-lg border ${notificationType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                notificationType === 'info' ? 'bg-blue-500/10 border-blue-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notificationType === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                  notificationType === 'info' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                  <i className={`fas ${notificationType === 'success' ? 'fa-check' : notificationType === 'info' ? 'fa-info' : 'fa-exclamation'} text-sm`}></i>
                </div>
                <div className={`flex-1 text-xs font-medium leading-relaxed ${notificationType === 'success' ? 'text-emerald-100' : notificationType === 'info' ? 'text-blue-100' : 'text-red-100'
                  }`}>{notificationMessage}</div>
                <button onClick={() => setShowNotification(false)} className="shrink-0 p-1"><i className="fas fa-times text-xs block"></i></button>
              </div>
            )}

            {/* SUCCESS VIEW */}
            {success ? (
              <div className="text-center space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl animate-slide-in">
                  <i className="fas fa-check-circle text-4xl text-emerald-500 mb-3"></i>
                  <h3 className="text-lg font-bold text-white mb-2">Success!</h3>
                  <p className="text-slate-400 text-sm">{message}</p>
                  <p className="text-indigo-400 text-xs mt-4 font-bold animate-pulse">Redirecting to login...</p>
                </div>
              </div>
            ) : (
              /* STEPS LOGIC */
              <>
                {/* STEP 1: EMAIL */}
                {step === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="relative z-10 space-y-5">
                    <p className="text-slate-400 text-sm text-center mb-4">Enter your email to reset your password.</p>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                      <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                          <i className="fa-regular fa-envelope text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                        </div>
                        <input
                          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                          placeholder="Enter your email" required
                        />
                      </div>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2 disabled:opacity-70">
                      {isLoading ? 'Processing...' : 'Continue'} <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  </form>
                )}

                {/* STEP 2: VERIFICATION */}
                {step === 'verification' && (
                  <form onSubmit={handleVerificationSubmit} className="relative z-10 space-y-5">
                    <p className="text-slate-400 text-sm text-center mb-2">Enter the 6-digit code sent to your email.</p>

                    {/* Timers */}
                    <div className="flex justify-center gap-2 mb-2">
                      {codeExpiresIn > 0 && (
                        <div className={`text-xs px-3 py-1 rounded-full border ${codeExpiresIn < 120 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                          ⏱️ Expires in: <strong>{formatTime(codeExpiresIn)}</strong>
                        </div>
                      )}
                      {remainingAttempts !== null && remainingAttempts < 5 && (
                        <div className={`text-xs px-3 py-1 rounded-full border ${remainingAttempts <= 2 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'}`}>
                          ⚠️ {remainingAttempts} attempts left
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Verification Code</label>
                      <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                          <i className="fa-solid fa-key text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                        </div>
                        <input
                          type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative tracking-widest"
                          placeholder="000000" maxLength={6} disabled={codeExpiresIn === 0} required
                        />
                      </div>
                    </div>

                    <button type="submit" disabled={isLoading || verificationCode.length !== 6 || codeExpiresIn === 0} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2 disabled:opacity-70">
                      {isLoading ? 'Verifying...' : 'Verify Code'}
                    </button>

                    <div className="text-center text-xs space-y-2">
                      {cooldownTime > 0 ? (
                        <span className="text-slate-500">Resend code in <span className="text-indigo-400 font-bold">{formatTime(cooldownTime)}</span></span>
                      ) : (
                        <button type="button" onClick={() => {
                          setStep('email'); setVerificationCode(''); setRemainingAttempts(null); setCodeExpiresIn(600);
                        }} className="text-indigo-400 hover:text-white transition-colors font-bold">
                          Resend Code
                        </button>
                      )}
                      <div><button type="button" onClick={() => setStep('email')} className="text-slate-500 hover:text-slate-300">Change Email</button></div>
                    </div>
                  </form>
                )}

                {/* STEP 3: RESET PASSWORD */}
                {step === 'reset' && (
                  <form onSubmit={handlePasswordReset} className="relative z-10 space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">New Password</label>
                      <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                          <i className="fa-solid fa-lock text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                        </div>
                        <input
                          type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 pr-12 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                          placeholder="New Password" minLength={6} required
                        />
                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-indigo-400 bg-transparent z-10">
                          <i className={`fa-regular ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Confirm Password</label>
                      <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                          <i className="fa-solid fa-lock text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                        </div>
                        <input
                          type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 pr-12 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                          placeholder="Confirm Password" minLength={6} required
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-indigo-400 bg-transparent z-10">
                          <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-base font-bold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2 disabled:opacity-70">
                      {isLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </form>
                )}

                <div className="mt-6 text-center relative z-10">
                  <p className="text-slate-500 text-xs font-medium">Remember your password? <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Back to Login</Link></p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="hidden lg:block w-[55%] relative bg-[#0f172a] overflow-hidden h-full">
          <div ref={mountRef} id="canvas-container" className="absolute inset-0 w-full h-full"></div>
          <div className="absolute bottom-0 left-0 w-full px-16 py-16 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent z-10 pointer-events-none">
            <h2 className="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Account<br />Recovery</h2>
            <p className="text-slate-400 text-xl max-w-xl leading-relaxed font-light">Securely reset your password and regain access to your QuickRoll dashboard.</p>
          </div>
        </div>

      </div>
    </>
  );
};

export default ForgotPassword;