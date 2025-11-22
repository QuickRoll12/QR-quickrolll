import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import * as THREE from 'three';

const FacultyResetPassword = () => {
  // ---------------------------------------------------
  // 1. STATE & LOGIC (Preserved)
  // ---------------------------------------------------
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userId: '',
    email: '',
    facultyId: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notification State
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('error');
  const [notificationMessage, setNotificationMessage] = useState('');

  const mountRef = useRef(null);

  // Helper: Notifications
  const showNotificationMessage = (msg, type = 'error') => {
    setNotificationMessage(msg);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  useEffect(() => {
    if (location.state?.email && location.state?.userId) {
      setFormData(prev => ({
        ...prev,
        email: location.state.email,
        userId: location.state.userId
      }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      showNotificationMessage('Passwords do not match', 'error');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      showNotificationMessage('Password must be at least 6 characters long', 'error');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authAPI.resetFacultyPassword({
        userId: formData.userId,
        email: formData.email,
        facultyId: formData.facultyId,
        newPassword: formData.newPassword
      });

      setSuccess(true);
      setMessage(response.message);
      showNotificationMessage(response.message, 'success');

      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      const errorMsg = err.message || 'Failed to reset password';
      setError(errorMsg);
      showNotificationMessage(errorMsg, 'error');
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

    const lineGeometry = new THREE.IcosahedronGeometry(15, 1);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.15 });
    const mesh = new THREE.Mesh(lineGeometry, lineMaterial);
    scene.add(mesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x6366f1, 2, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

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
        
        /* Custom Scrollbar for Left Panel */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.7); }
      `}</style>

      <div className="fixed inset-0 w-full h-full flex bg-[#0f172a] text-white overflow-hidden z-[100]">

        {/* LEFT PANEL - SCROLLABLE FORM */}
        {/* Added: items-center, overflow-y-auto, custom-scrollbar, pt-10, pb-10. Removed: justify-center */}
        <div className="w-full lg:w-[45%] flex flex-col items-center px-6 lg:px-8 bg-[#0f172a] z-20 shadow-2xl relative h-full overflow-y-auto custom-scrollbar pt-10 pb-10">

          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none fixed"></div>

          {/* Form Wrapper: Added shrink-0 */}
          <div className="glass-panel w-full max-w-[420px] rounded-2xl p-6 md:p-8 relative overflow-hidden z-10 shrink-0">

            {/* HEADER */}
            <div className="relative z-10 text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                <i className="fa-solid fa-key text-3xl text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"></i>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Reset Password
              </h1>
              <p className="text-slate-400 text-xs font-semibold tracking-wide uppercase opacity-80">Faculty Portal</p>
            </div>

            {/* NOTIFICATION UI */}
            {showNotification && (
              <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-4 animate-slide-in backdrop-blur-md shadow-lg border ${notificationType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                'bg-red-500/10 border-red-500/20'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notificationType === 'success' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]' :
                  'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]'
                  }`}>
                  <i className={`fas ${notificationType === 'success' ? 'fa-check' : 'fa-exclamation'} text-sm`}></i>
                </div>
                <div className={`flex-1 text-xs font-medium leading-relaxed ${notificationType === 'success' ? 'text-emerald-100' : 'text-red-100'
                  }`}>{notificationMessage}</div>
                <button onClick={() => setShowNotification(false)} className="shrink-0 p-1"><i className="fas fa-times text-xs block"></i></button>
              </div>
            )}

            {/* SUCCESS VIEW */}
            {success ? (
              <div className="text-center space-y-6">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl animate-slide-in">
                  <i className="fas fa-check-circle text-4xl text-emerald-500 mb-3"></i>
                  <h3 className="text-lg font-bold text-white mb-2">Password Reset!</h3>
                  <p className="text-slate-400 text-sm">{message}</p>
                  <p className="text-indigo-400 text-xs mt-4 font-bold animate-pulse">Redirecting to login...</p>
                </div>
              </div>
            ) : (
              /* FORM */
              <form onSubmit={handleSubmit} className="relative z-10 space-y-5">

                {/* Email (Read Only) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                      <i className="fa-regular fa-envelope text-lg text-slate-500 transition-colors"></i>
                    </div>
                    <input
                      type="email" name="email" value={formData.email} onChange={handleChange}
                      className="w-full bg-[#0f172a]/40 border border-white/5 text-slate-400 text-sm rounded-xl focus:outline-none block pl-14 p-3.5 backdrop-blur-sm cursor-not-allowed"
                      placeholder="Enter your email" required readOnly={!!location.state?.email}
                    />
                  </div>
                </div>

                {/* Faculty ID */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Faculty ID</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                      <i className="fa-solid fa-id-badge text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                    </div>
                    <input
                      type="text" name="facultyId" value={formData.facultyId} onChange={handleChange}
                      className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                      placeholder="Enter your Faculty ID" required
                    />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">New Password</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                      <i className="fa-solid fa-lock text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                    </div>
                    <input
                      type={showNewPassword ? "text" : "password"} name="newPassword" value={formData.newPassword} onChange={handleChange}
                      className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 pr-12 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                      placeholder="Enter new password" required
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-indigo-400 bg-transparent z-10">
                      <i className={`fa-regular ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Confirm Password</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none z-10">
                      <i className="fa-solid fa-lock text-lg text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                      className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-14 pr-12 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                      placeholder="Confirm new password" required
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-4 flex items-center text-slate-500 hover:text-indigo-400 bg-transparent z-10">
                      <i className={`fa-regular ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Password Requirements:</p>
                  <ul className="space-y-1">
                    <li className={`text-xs flex items-center gap-2 ${formData.newPassword.length >= 6 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <i className={`fas ${formData.newPassword.length >= 6 ? 'fa-check-circle' : 'fa-circle text-[6px]'}`}></i>
                      At least 6 characters
                    </li>
                    <li className={`text-xs flex items-center gap-2 ${formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                      <i className={`fas ${formData.newPassword === formData.confirmPassword && formData.newPassword.length > 0 ? 'fa-check-circle' : 'fa-circle text-[6px]'}`}></i>
                      Passwords match
                    </li>
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Link to="/login" className="w-1/3 flex items-center justify-center py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-bold">
                    Cancel
                  </Link>
                  <button type="submit" disabled={isLoading} className="w-2/3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-3 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] flex justify-center items-center gap-2 disabled:opacity-70">
                    {isLoading ? 'Reseting...' : 'Reset Password'}
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="hidden lg:block w-[55%] relative bg-[#0f172a] overflow-hidden h-full">
          <div ref={mountRef} id="canvas-container" className="absolute inset-0 w-full h-full"></div>
          <div className="absolute bottom-0 left-0 w-full px-16 py-16 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent z-10 pointer-events-none">
            <h2 className="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Secure Your<br />Account</h2>
            <p className="text-slate-400 text-xl max-w-xl leading-relaxed font-light">Ensure your faculty account remains secure by choosing a strong, unique password.</p>
          </div>
        </div>

      </div>
    </>
  );
};

export default FacultyResetPassword;