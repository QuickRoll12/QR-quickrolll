import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import GitHubIcon from '@mui/icons-material/GitHub';
import EmailIcon from '@mui/icons-material/Email';
import CodeIcon from '@mui/icons-material/Code';

const founderData = [
  {
    name: "Himanshu Rawat",
    role: "Technical Lead",
    image: '/Himanshu_rawat.png',
    bio: "With strong problem-solving skills and an optimized approach, I drive the technical vision of QuickRoll, ensuring seamless attendance tracking.",
    social: {
      linkedin: "https://www.linkedin.com/in/himanshurawat12",
      github: "https://github.com/HimanshuRawat143",
      email: "mailto:himu35311@gmail.com",
      leetcode: "https://leetcode.com/u/Himanshu_Rawat_12/"
    }
  },
  {
    name: "Ayush Bhatt",
    role: "Concept Designer & RnD",
    image: '/Ayush_bhatt.png',
    bio: "As a Concept Designer & RnD Lead, I drive conceptual ideation, innovation and strategy for a seamless and reliable attendance mechanism.",
    social: {
      linkedin: "https://www.linkedin.com/in/ayush-bhatt-162734305/",
      github: "https://github.com/AyushBhatt2312",
      email: "mailto:ayushbhatt231205@gmail.com",
      leetcode: "https://leetcode.com/u/Ayushbhatt23/"
    }
  },
  {
    name: "Abhishek Negi",
    role: "FAQ Insights & Analyst",
    image: '/Abhishek_negi.jpg',
    bio: "I specialize in simplifying complex queries into clear, effective solutions through research and strategic analysis.",
    social: {
      linkedin: "https://www.linkedin.com/in/abhishek-negi-300b862b4",
      github: "https://github.com/AbhishekNgi",
      email: "mailto:aabhinegi05@gmail.com",
      leetcode: "https://leetcode.com/u/Abhishek2007/"
    }
  },
  {
    name: "Ashutosh Rauthan",
    role: "Simulation & Testing",
    image: '/Ashutosh_rauthan.jpg',
    bio: "I analyzed various real-life proxy marking methods, helping us identify and resolve potential loopholes in advance.",
    social: {
      linkedin: "https://linkedin.com/in/ashutosh-rauthan-277404339",
      github: "https://github.com/AshutoshRauthan",
      email: "mailto:rauthanashutosh2023@gmail.com",
      leetcode: "https://leetcode.com/u/AshutoshRauthan/"
    }
  }
];

const AboutUs = () => {
  const mountRef = useRef(null);

  // Three.js Background Animation Logic
  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const scene = new THREE.Scene();
    // Match the fog color to the background color
    scene.fog = new THREE.FogExp2(0x0f172a, 0.002);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // Important: Set clear color to match background in case of alpha issues
    renderer.setClearColor(0x0f172a, 1);

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 120;
      colors[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Floating Shapes
    const shapes = [];
    const shapeGeo = new THREE.IcosahedronGeometry(1, 0);
    const shapeMat = new THREE.MeshPhongMaterial({
      color: 0x818cf8,
      shininess: 100,
      flatShading: true
    });

    for (let i = 0; i < 20; i++) {
      const shape = new THREE.Mesh(shapeGeo, shapeMat);
      shape.position.set((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 50);
      shape.scale.setScalar(Math.random() * 2 + 0.5);
      scene.add(shape);
      shapes.push({
        mesh: shape,
        rotSpeed: Math.random() * 0.02,
        yOffset: Math.random() * Math.PI * 2
      });
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0x6366f1, 2, 50);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Mouse Interaction
    let mouseX = 0, mouseY = 0;
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const handleMouseMove = (event) => {
      mouseX = (event.clientX - windowHalfX);
      mouseY = (event.clientY - windowHalfY);
    };
    document.addEventListener('mousemove', handleMouseMove);

    // Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      particles.rotation.y += 0.0005;
      camera.position.x += (mouseX * 0.005 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 0.005 - camera.position.y) * 0.05;
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
      const width = window.innerWidth;
      const height = window.innerHeight;
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
      shapeGeo.dispose();
      shapeMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <style>{`
        /* Removed body style injection as it is unreliable in React */

        /* Glassmorphism */
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          transition: all 0.3s ease;
        }

        .glass-panel:hover {
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-5px);
          box-shadow: 0 30px 60px -12px rgba(99, 102, 241, 0.15);
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
          background: #3730a3;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }

        /* Avatar Glow */
        .avatar-glow {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
          transition: all 0.3s ease;
        }
        .glass-panel:hover .avatar-glow {
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.5);
          transform: scale(1.05);
        }
      `}</style>

      {/* Added bg-[#0f172a] here to force the dark background on the container */}
      <div className="bg-[#0f172a] text-white antialiased selection:bg-indigo-500 selection:text-white overflow-x-hidden min-h-screen relative">

        {/* Background Animation Container */}
        <div ref={mountRef} id="canvas-container" className="fixed inset-0 w-full h-full z-0 pointer-events-none"></div>

        {/* Background Gradient Overlay - Exactly matching HTML */}
        <div className="fixed inset-0 bg-gradient-to-br from-indigo-900/20 via-[#0f172a] to-[#0f172a] pointer-events-none z-0"></div>

        {/* Main Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
              Meet Our Team
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              The minds behind QuickRoll, dedicated to revolutionizing attendance management with secure and efficient solutions.
            </p>
          </div>

          {/* Team Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl w-full mb-20">
            {founderData.map((founder, index) => (
              <div key={index} className="glass-panel rounded-3xl p-6 flex flex-col items-center text-center group">
                <div className="w-32 h-32 mb-6 rounded-full p-1 bg-gradient-to-br from-indigo-500 to-purple-600 avatar-glow">
                  <img
                    src={founder.image}
                    alt={founder.name}
                    className="w-full h-full rounded-full object-cover border-4 border-[#0f172a]"
                  />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">{founder.name}</h3>
                <p className="text-indigo-400 font-semibold text-sm mb-4 uppercase tracking-wide">{founder.role}</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-grow">
                  {founder.bio}
                </p>

                {/* Social Links - Using MUI icons styled like the HTML buttons */}
                <div className="flex gap-3 mt-auto">
                  {founder.social.linkedin && (
                    <a href={founder.social.linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-indigo-600 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300">
                      <LinkedInIcon className="text-[1.1rem]" />
                    </a>
                  )}
                  {founder.social.github && (
                    <a href={founder.social.github} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-gray-800 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300">
                      <GitHubIcon className="text-[1.1rem]" />
                    </a>
                  )}
                  {founder.social.email && (
                    <a href={founder.social.email}
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-red-500 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300">
                      <EmailIcon className="text-[1.1rem]" />
                    </a>
                  )}
                  {founder.social.leetcode && (
                    <a href={founder.social.leetcode} target="_blank" rel="noopener noreferrer"
                      className="w-9 h-9 rounded-full bg-white/5 hover:bg-yellow-600 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-300">
                      <CodeIcon className="text-[1.1rem]" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* About QuickRoll Section */}
          <div className="glass-panel w-full max-w-5xl rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>

            <h2 className="text-3xl font-bold text-white mb-6">About QuickRoll</h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-4xl mx-auto">
              QuickRoll is a modern attendance management system designed to streamline the process of tracking
              student attendance in educational institutions. Our platform combines cutting-edge technology with
              user-friendly design to create an efficient and reliable solution for both faculty and students. With
              real-time tracking, intuitive interfaces, and comprehensive reporting, QuickRoll makes attendance
              management simpler and more effective than ever before.
            </p>

            <div className="mt-8 flex justify-center gap-4">
              <Link to="/login"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)]">
                Get Started
              </Link>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default AboutUs;