import React, { useEffect } from 'react';

const ParticlesBackground = () => {
  useEffect(() => {
    // Load particles.js script
    const loadParticlesScript = () => {
      const existingScript = document.getElementById('particles-js-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
        script.id = 'particles-js-script';
        script.async = true;
        script.onload = initParticles;
        document.body.appendChild(script);
      } else if (window.particlesJS) {
        // If script already loaded, initialize particles
        initParticles();
      }
    };

    // Initialize particles
    function initParticles() {
      if (window.particlesJS) {
        window.particlesJS('particles-js', {
        particles: {
            number: { 
                value: 80, 
                density: { 
                    enable: true, 
                    value_area: 800 
                } 
            },
            color: { 
                value: ['#ffffff', '#ffcc00', '#00ffcc'] // White, gold, and teal colors
            },
            shape: { 
                type: 'circle' 
            },
            opacity: { 
                value: 0.5, 
                random: true 
            },
            size: { 
                value: 3, 
                random: true 
            },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#ffffff', // White connecting lines for better visibility
                opacity: 0.6, // Slightly more opaque
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: 'none',
                random: true,
                out_mode: 'out'
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { 
                    enable: true, 
                    mode: 'grab' 
                },
                onclick: { 
                    enable: true, 
                    mode: 'push' 
                }
            },
            modes: {
                grab: { 
                    distance: 140, 
                    line_linked: { 
                        opacity: 1 
                    } 
                },
                push: { 
                    particles_nb: 4 
                }
            }
        },
        retina_detect: true
        });
      }
    }

    loadParticlesScript();

    // Cleanup function
    return () => {
      // Optional: Destroy particles instance when component unmounts
      if (window.pJSDom && window.pJSDom.length > 0) {
        window.pJSDom[0].pJS.fn.vendors.destroypJS();
        window.pJSDom = [];
      }
    };
  }, []);

  return <div id="particles-js" />;
};

export default ParticlesBackground;
