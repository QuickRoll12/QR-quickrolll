import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as THREE from 'three';

// Use environment variable directly instead of importing from config
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

const FacultyRequestForm = () => {
  // ---------------------------------------------------
  // 1. STATE & LOGIC
  // ---------------------------------------------------
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [teachingAssignments, setTeachingAssignments] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationType, setNotificationType] = useState('error');
  const [notificationMessage, setNotificationMessage] = useState('');

  const [availableSections, setAvailableSections] = useState([
    'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2', 'F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2', 'K1', 'K2', 'L1', 'L2', 'ML1', 'ML2', 'ML3', 'DS1', 'DS2', 'DSA', 'Placement Group 1', 'Placement Group 2', 'Placement Group 3', 'Placement Group 4', 'Placement Group 5'
  ]);
  const departments = ['BTech', 'BCA', 'BCom', 'BBA', 'Law', 'MCA', 'MBA', 'BPharm', 'BSc'];
  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const navigate = useNavigate();
  const mountRef = useRef(null);

  const showNotificationMessage = (msg, type = 'error') => {
    setNotificationMessage(msg);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 5000);
  };

  const validateForm = () => {
    if (!name.trim()) { showNotificationMessage('Please enter your full name', 'error'); return false; }
    if (!email.trim()) { showNotificationMessage('Please enter your email address', 'error'); return false; }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) { showNotificationMessage('Please enter a valid email address', 'error'); return false; }
    if (!department) { showNotificationMessage('Please select your department', 'error'); return false; }
    if (teachingAssignments.length === 0) { showNotificationMessage('Please add at least one semester-section combination', 'error'); return false; }
    if (!photo) { showNotificationMessage('Please upload your ID card photo', 'error'); return false; }
    if (photo.size > 1024 * 1024) { showNotificationMessage('Photo size should not exceed 1MB.', 'error'); return false; }
    return true;
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'];
      if (!validTypes.includes(file.type)) { showNotificationMessage('Invalid file type (JPG, JPEG, PNG only)', 'error'); return; }
      if (file.size > 1024 * 1024) { showNotificationMessage('File too large (Max 1MB)', 'error'); e.target.value = ''; return; }

      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
      showNotificationMessage('Photo uploaded successfully', 'success');
    }
  };

  const handleAddAssignment = () => {
    if (!selectedSemester || !selectedSection) { showNotificationMessage('Select both semester and section', 'error'); return; }
    const exists = teachingAssignments.some(a => a.semester === selectedSemester && a.section === selectedSection);
    if (exists) { showNotificationMessage('Combination already added', 'info'); return; }
    setTeachingAssignments([...teachingAssignments, { semester: selectedSemester, section: selectedSection }]);
    setSelectedSemester('');
    setSelectedSection('');
  };

  const handleRemoveAssignment = (semToRemove, secToRemove) => {
    setTeachingAssignments(teachingAssignments.filter(a => !(a.semester === semToRemove && a.section === secToRemove)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');
      try {
        const uploadUrlResponse = await axios.get(`${BACKEND_URL}/api/auth/get-upload-url`, {
          params: { fileName: photo.name, fileType: photo.type }
        });
        const { uploadUrl, s3Key } = uploadUrlResponse.data;
        await axios.put(uploadUrl, photo, { headers: { 'Content-Type': photo.type } });

        const requestData = {
          name: name.trim(),
          email: email.trim(),
          department,
          teachingAssignments: JSON.stringify(teachingAssignments),
          s3Key
        };

        const response = await axios.post(`${BACKEND_URL}/api/auth/faculty-request-s3`, requestData, {
          headers: { 'Content-Type': 'application/json' }
        });

        const successMsg = response.data.message || 'Request submitted successfully.';
        setMessage(successMsg);
        showNotificationMessage(successMsg, 'success');
        setName(''); setEmail(''); setDepartment(''); setTeachingAssignments([]);
        setSelectedSemester(''); setSelectedSection(''); setPhoto(null); setPhotoPreview(null);
        setTimeout(() => navigate('/login'), 5000);

      } catch (s3Error) {
        console.error('S3 failed, trying fallback...', s3Error);
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('email', email.trim());
        formData.append('department', department);
        formData.append('teachingAssignments', JSON.stringify(teachingAssignments));
        formData.append('photo', photo);

        const response = await axios.post(`${BACKEND_URL}/api/auth/faculty-request`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const successMsg = response.data.message || 'Request submitted successfully.';
        setMessage(successMsg);
        showNotificationMessage(successMsg, 'success');
        setTimeout(() => navigate('/login'), 5000);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to submit request.';
      setError(errorMsg);
      showNotificationMessage(errorMsg, 'error');
    } finally {
      setLoading(false);
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
      geometry.dispose(); material.dispose(); lineGeometry.dispose(); lineMaterial.dispose(); renderer.dispose();
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        /* 1. Global page lock */
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #0f172a; overflow: hidden; }
        
        .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
        input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus, select:-webkit-autofill, select:-webkit-autofill:hover, select:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 30px #0f172a inset !important; -webkit-text-fill-color: white !important; transition: background-color 5000s ease-in-out 0s; }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.1); border-color: rgba(99, 102, 241, 0.3); } 50% { box-shadow: 0 0 25px rgba(99, 102, 241, 0.2); border-color: rgba(99, 102, 241, 0.6); } }
        .input-focus-glow:focus-within { animation: pulse-glow 2s infinite; }
        
        /* 2. Custom Scrollbar for the Left Panel ONLY */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.5); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.7); }
        
        select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
        @keyframes slide-in-down { 0% { opacity: 0; transform: translateY(-10px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-in { animation: slide-in-down 0.3s ease-out forwards; }
      `}</style>

      {/* 3. FIXED INSET-0: This forces the page to be exactly screen size, no window scrolling */}
      <div className="fixed inset-0 w-full h-full flex bg-[#0f172a] text-white overflow-hidden z-[100]">

        {/* LEFT SIDE - SCROLLABLE FORM (overflow-y-auto handles internal scrolling) */}
        <div className="w-full lg:w-[45%] flex flex-col items-center px-4 lg:px-8 bg-[#0f172a] z-20 shadow-2xl relative h-full overflow-y-auto custom-scrollbar pt-10 pb-10">

          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none fixed"></div>

          <div className="glass-panel w-full max-w-[600px] rounded-3xl p-6 md:p-8 lg:p-10 relative overflow-hidden z-10 shrink-0">

            {/* HEADER */}
            <div className="relative z-10 text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-sm">
                <i className="fa-solid fa-chalkboard-user text-3xl text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"></i>
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Faculty Request
              </h1>
              <p className="text-slate-400 text-sm font-semibold tracking-wide uppercase opacity-80">Request a faculty account</p>
            </div>

            {/* NOTIFICATION AREA */}
            {showNotification && (
              <div className={`mb-5 p-3.5 rounded-xl flex items-center gap-4 animate-slide-in backdrop-blur-md shadow-lg border ${notificationType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' :
                notificationType === 'info' ? 'bg-blue-500/10 border-blue-500/20' :
                  'bg-red-500/10 border-red-500/20'
                }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notificationType === 'success' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]' :
                  notificationType === 'info' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-red-500/20 text-red-400 shadow-[0_0_10px_rgba(248,113,113,0.3)]'
                  }`}>
                  <i className={`fas ${notificationType === 'success' ? 'fa-check' : notificationType === 'info' ? 'fa-info' : 'fa-exclamation'} text-sm`}></i>
                </div>
                <div className={`flex-1 text-xs font-medium leading-relaxed ${notificationType === 'success' ? 'text-emerald-100' : notificationType === 'info' ? 'text-blue-100' : 'text-red-100'
                  }`}>
                  {notificationMessage}
                </div>
                <button
                  onClick={() => setShowNotification(false)}
                  className={`shrink-0 p-1 rounded-lg transition-colors ${notificationType === 'success' ? 'text-emerald-400 hover:bg-emerald-500/20' :
                    notificationType === 'info' ? 'text-blue-400 hover:bg-blue-500/20' :
                      'text-red-400 hover:bg-red-500/20'
                    }`}
                >
                  <i className="fas fa-times text-xs block"></i>
                </button>
              </div>
            )}

            {/* SUCCESS STATE */}
            {message ? (
              <div className="text-center space-y-6">
                <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-xl">
                  <i className="fas fa-check-circle text-4xl text-green-500 mb-4"></i>
                  <h3 className="text-xl font-bold text-white mb-2">Request Submitted!</h3>
                  <p className="text-slate-400 text-sm mb-6">{message}</p>
                  <Link to="/login" className="inline-block bg-slate-700 hover:bg-slate-600 text-white py-3 px-8 rounded-xl font-medium transition-all">
                    Back to Login
                  </Link>
                </div>
              </div>
            ) : (
              /* FORM */
              <form onSubmit={handleSubmit} className="relative z-10 space-y-5">
                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Full Name</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <i className="fa-regular fa-user text-base text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-10 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                      placeholder="Dr. Sarah Smith"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <i className="fa-regular fa-envelope text-base text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-10 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm relative"
                      placeholder="sarah.smith@university.edu"
                      required
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Department</label>
                  <div className="relative group input-focus-glow rounded-xl transition-all duration-300">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                      <i className="fa-solid fa-building text-base text-slate-500 group-focus-within:text-indigo-400 transition-colors"></i>
                    </div>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-[#0f172a]/60 border border-white/10 text-white text-sm rounded-xl focus:outline-none focus:border-indigo-500 block pl-10 p-3.5 placeholder-slate-500 transition-all duration-300 backdrop-blur-sm cursor-pointer relative"
                      required
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept} className="bg-[#0f172a] text-white">{dept}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Teaching Assignments */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Teaching Assignments</label>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase ml-1">Semester</label>
                        <select
                          value={selectedSemester}
                          onChange={(e) => setSelectedSemester(e.target.value)}
                          className="w-full bg-[#0f172a]/80 border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 block p-2.5 text-slate-300 cursor-pointer"
                        >
                          <option value="" disabled>Sem</option>
                          {semesters.map(sem => <option key={sem} value={sem} className="bg-[#0f172a]">{sem}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-slate-500 uppercase ml-1">Section</label>
                        <select
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          className="w-full bg-[#0f172a]/80 border border-white/10 text-white text-sm rounded-lg focus:ring-1 focus:ring-indigo-500 block p-2.5 text-slate-300 cursor-pointer"
                        >
                          <option value="" disabled>Sec</option>
                          {availableSections.map(sec => <option key={sec} value={sec} className="bg-[#0f172a]">{sec}</option>)}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <button
                          type="button"
                          onClick={handleAddAssignment}
                          disabled={!selectedSemester || !selectedSection}
                          className="w-full bg-indigo-600/20 hover:bg-indigo-600 hover:text-white text-indigo-400 border border-indigo-500/30 rounded-lg p-2.5 transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      </div>
                    </div>

                    {teachingAssignments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {teachingAssignments.map((assignment, index) => (
                          <div key={index} className="bg-indigo-500/20 border border-indigo-500/30 rounded-lg pl-3 pr-2 py-1.5 text-xs text-indigo-200 flex items-center gap-2 group hover:bg-indigo-500/30 transition-colors cursor-default">
                            <span>Sem {assignment.semester} - {assignment.section}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveAssignment(assignment.semester, assignment.section)}
                              className="text-indigo-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-indigo-500/50 w-4 h-4 flex items-center justify-center"
                            >
                              <i className="fa-solid fa-xmark text-[10px]"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 italic">Add all semester-section combinations you teach.</p>
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">ID Card Photo</label>
                  <div className="relative group w-full">
                    <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] overflow-hidden">
                      {photoPreview ? (
                        <div className="w-full h-full relative group-hover:opacity-75 transition-opacity">
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-contain p-2" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <span className="text-white font-bold text-sm">Change Photo</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <i className="fa-solid fa-cloud-arrow-up text-3xl text-slate-500 mb-3 group-hover:text-indigo-400 transition-colors group-hover:scale-110 transform duration-300"></i>
                          <p className="mb-1 text-sm text-slate-400"><span className="font-semibold text-indigo-400">Click to upload</span> or drag and drop</p>
                          <p className="text-xs text-slate-500">JPG, PNG (MAX. 1MB)</p>
                        </div>
                      )}
                      <input id="file-upload" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-lg font-bold py-4 rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.98] shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] flex justify-center items-center gap-3 group cursor-pointer mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>{loading ? 'Submitting...' : 'Submit Request'}</span>
                  {!loading && <i className="fa-solid fa-paper-plane transition-transform group-hover:translate-x-1 group-hover:-translate-y-1"></i>}
                </button>

              </form>
            )}

            <div className="mt-6 text-center relative z-10">
              <p className="text-slate-500 text-sm font-medium">Changed your mind? <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">Back to Login</Link></p>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - THREE.JS ANIMATION */}
        <div className="hidden lg:block w-[55%] relative bg-[#0f172a] overflow-hidden h-full">
          <div ref={mountRef} id="canvas-container" className="absolute inset-0 w-full h-full"></div>
          <div className="absolute bottom-0 left-0 w-full px-16 py-16 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/90 to-transparent z-10 pointer-events-none">
            <h2 className="text-5xl font-bold text-white mb-6 tracking-tight leading-tight">Empower Your<br />Classroom</h2>
            <p className="text-slate-400 text-xl max-w-xl leading-relaxed font-light">Streamline attendance, track performance, and focus on what matters most - teaching.</p>
          </div>
        </div>

      </div>
    </>
  );
};

export default FacultyRequestForm;