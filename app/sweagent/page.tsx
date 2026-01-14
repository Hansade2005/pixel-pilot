"use client";
import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import Link from 'next/link';
import {
  Rocket, CheckCircle, Bot, Code, Shield, Github,
  Layers, Sparkles, ArrowRight, Terminal, Bug, Brain, ChevronRight,
  GitPullRequest, BookOpen, Play, AlertCircle, RotateCcw // Added new icons
} from 'lucide-react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// --- Sub-Components for better organization ---

// 1. Custom Cursor Component
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const addHoverListeners = () => setIsHovered(true);
    const removeHoverListeners = () => setIsHovered(false);

    document.addEventListener('mousemove', handleMouseMove as any);

    const clickables = document.querySelectorAll('a, button, .tilt-card');
    clickables.forEach(el => {
      el.addEventListener('mouseenter', addHoverListeners);
      el.addEventListener('mouseleave', removeHoverListeners);
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove as any);
      clickables.forEach(el => {
        el.removeEventListener('mouseenter', addHoverListeners);
        el.removeEventListener('mouseleave', removeHoverListeners);
      });
    };
  }, []);

  return (
    <>
      <div
        className="fixed top-0 left-0 w-2 h-2 bg-cyan-400 rounded-full pointer-events-none z-[9999] mix-blend-difference"
        style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      />
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 border border-purple-500/50 rounded-full pointer-events-none z-[9999]"
        animate={{
          x: position.x - 20,
          y: position.y - 20,
          scale: isHovered ? 1.5 : 1,
          backgroundColor: isHovered ? "rgba(124, 58, 237, 0.1)" : "transparent"
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.5 }}
      />
    </>
  );
};

// 2. Neural Background Canvas
const NeuralBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let particles: any[] = [];
    const particleCount = Math.min(window.innerWidth / 10, 60);

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
        this.color = Math.random() > 0.5 ? 'rgba(124, 58, 237,' : 'rgba(6, 182, 212,';
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = this.color + '0.5)';
        ctx!.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) particles.push(new Particle());

    const animate = () => {
      ctx!.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        for (let j = i; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 150) {
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(255, 255, 255, ${0.05 - distance / 3000})`;
            ctx!.lineWidth = 0.5;
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[-1] opacity-40" />;
};

// 3. Typing Effect Hook
const useTypingEffect = (phrases: string[], speed = 100, delay = 2000) => {
  const [displayText, setDisplayText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    const timeout = setTimeout(() => {
      if (paused) {
        setPaused(false);
        return;
      }

      if (!isDeleting) {
        setDisplayText(currentPhrase.substring(0, displayText.length + 1));
        if (displayText.length === currentPhrase.length) {
          setPaused(true);
          setTimeout(() => setIsDeleting(true), delay);
        }
      } else {
        setDisplayText(currentPhrase.substring(0, displayText.length - 1));
        if (displayText.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? speed / 2 : speed);

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, phraseIndex, phrases, speed, delay, paused]);

  return displayText;
};

// 4. 3D Tilt Card Component
const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateXVal = ((y - centerY) / centerY) * -5;
    const rotateYVal = ((x - centerX) / centerX) * 5;

    setRotateX(rotateXVal);
    setRotateY(rotateYVal);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
        transition: "transform 0.1s ease-out"
      }}
    >
      {children}
    </div>
  );
};

// 5. Reveal Animation Wrapper
const Reveal = ({ children, delay = 0, width = "100%" }: { children: React.ReactNode, delay?: number, width?: string }) => {
  return (
    <div style={{ position: "relative", width, overflow: "hidden" }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 }
        }}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
};

// --- Main Page Component ---
export default function Home() {
  const typedText = useTypingEffect([
    "Transforming GitHub issues into deployable code...",
    "Refactoring legacy systems in seconds...",
    "Running tests in parallel environments...",
    "Deploying to edge networks automatically..."
  ]);

  // Modal state for image preview
  const [selectedImage, setSelectedImage] = useState<{ src: string, title: string, desc: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (image: { src: string, title: string, desc: string }) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  // --- NEW REALISTIC SIMULATION LOGIC ---

  // Simulation Steps:
  // 0: Idle
  // 1: Issue Created
  // 2: Bot Analyzing
  // 3: Bot Plan
  // 4: Bot Complete (PR Created)
  // 5: Viewing PR List
  // 6: Viewing PR Detail (Conversation Tab)
  // 7: Viewing PR Detail (Files Changed Tab)
  // 8: Merged
  const [step, setStep] = useState(0);
  const [currentView, setCurrentView] = useState<'issue' | 'pr-list' | 'pr-detail'>('issue');
  const [activeTab, setActiveTab] = useState<'conversation' | 'files'>('conversation');
  const [botTyping, setBotTyping] = useState(false);
  const [typingText, setTypingText] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Helper to add comments
  const addBotComment = (text: string, type: 'text' | 'plan' = 'text', delay: number = 0) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setBotTyping(true);
        setTypingText("");
        let i = 0;
        const interval = setInterval(() => {
          setTypingText(text.slice(0, i));
          i++;
          if (i > text.length) {
            clearInterval(interval);
            setBotTyping(false);
            setComments((prev) => [...prev, { role: 'bot', text, type }]);
            resolve();
          }
        }, 20); // Fast typing
      }, delay);
    });
  };

  const runSimulation = async () => {
    setIsAutoPlaying(true);
    setStep(1);
    setCurrentView('issue');
    setComments([]);

    // Scene 1: Issue Created (2 seconds)
    await new Promise(r => setTimeout(r, 2000));

    // Scene 2: Bot Analysis & Plan (4 seconds total with typing)
    await addBotComment("I'm analyzing the codebase structure and dependencies for JWT authentication...", 'text');
    await new Promise(r => setTimeout(r, 1500));
    await addBotComment("Here is the implementation plan:\n- Create `auth/middleware.js`\n- Add login endpoint in `routes/login.js`\n- Write tests in `tests/auth.test.js`", 'plan');

    // Scene 3: Completion (2 seconds before moving forward)
    await new Promise(r => setTimeout(r, 2000));
    await addBotComment("✅ Implementation complete. Created PR #403 with full changes.", 'text');

    // Scene 4: Navigate to PR List (3.5 seconds)
    await new Promise(r => setTimeout(r, 3500));
    setCurrentView('pr-list');

    // Scene 5: Open PR (4.5 seconds)
    await new Promise(r => setTimeout(r, 4500));
    setCurrentView('pr-detail');
    setActiveTab('conversation');

    // Scene 6: Switch to Files (5.5 seconds)
    await new Promise(r => setTimeout(r, 5500));
    setActiveTab('files');

    // Scene 7: Back to Conversation (8 seconds)
    await new Promise(r => setTimeout(r, 8000));
    setActiveTab('conversation');

    // Scene 8: Merge (2 seconds)
    await new Promise(r => setTimeout(r, 2000));
    setStep(8); // Merged State
    setIsAutoPlaying(false);
  };

  const resetSimulation = () => {
    setStep(0);
    setCurrentView('issue');
    setActiveTab('conversation');
    setComments([]);
    setTypingText('');
    setBotTyping(false);
    setIsAutoPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[#030305] text-white overflow-x-hidden selection:bg-purple-500 selection:text-white font-sans">
      <CustomCursor />
      <NeuralBackground />

      {/* Background Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[-1] bg-grid opacity-20"
        style={{ backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`, backgroundSize: '40px 40px' }}
      />

      {/* Image Preview Modal */}
      {isModalOpen && selectedImage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={closeModal}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative max-w-4xl max-h-[90vh] w-full bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/70 border border-white/20 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image */}
            <div className="relative">
              <img
                src={selectedImage.src}
                alt={selectedImage.title}
                className="w-full h-auto max-h-[70vh] object-contain"
              />

              {/* Gradient overlay for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Text content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <motion.h3
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-white mb-2"
                >
                  {selectedImage.title}
                </motion.h3>
                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-300 text-lg leading-relaxed"
                >
                  {selectedImage.desc}
                </motion.p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300 py-6 backdrop-blur-md bg-black/30 border-b border-white/5">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <Link href="#" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="PiPilot Logo" className=" w-12 h-12" />
            <span className="font-display font-bold text-xl tracking-tight text-white">PiPilot</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#workflow" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Workflow</Link>
            <Link href="#showcase" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Showcase</Link>
            <Link href="#pricing" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Pricing</Link>
          </div>

          <Link href="https://github.com/apps/pipilot-swe-agent">
            <button className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 backdrop-blur-md px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-all flex items-center gap-2 group">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
          {/* Decorative Glows */}
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1.5s' }} />

          <div className="container mx-auto px-6 relative z-10 text-center">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-purple-500/30 mb-8 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                <span className="text-sm font-medium text-purple-200">v2.0 is now live: 4D Engine Included</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter mb-6 leading-tight">
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500">
                  Autonomous
                </span>
                <span className="block pb-1 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mt-2">
                  SWE Agent
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="h-8 mb-8">
                <p className="text-xl md:text-2xl text-gray-400 font-mono inline-block border-r-2 border-cyan-500 pr-2">
                  {typedText}
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20">
                <Link href="https://github.com/apps/pipilot-swe-agent">
                  <button className="relative px-8 py-4 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform duration-300 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="relative group-hover:text-white flex items-center gap-2">
                      Start Building Free <Rocket className="w-5 h-5" />
                    </span>
                  </button>
                </Link>
              </div>
            </Reveal>

            {/* --- NEW SIMULATION UI --- */}
            <Reveal delay={0.4}>
              <div className="relative max-w-6xl mx-auto">
                <TiltCard className="bg-[#0d1117] border border-white/10 shadow-2xl rounded-xl overflow-hidden animate-float">

                  {/* GitHub Header Mockup */}
                  <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-[#161b22]">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">Pi</div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-300">PiPilot</span>
                        <span className="text-gray-600">/</span>
                        <span className="text-white font-semibold">swe-agent</span>
                      </div>
                      <div className="hidden md:flex items-center gap-1 text-xs bg-white/5 px-2 py-1 rounded-md">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Public
                      </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center gap-1">
                      <button className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentView === 'issue' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <i className="mr-1">●</i> Issues
                      </button>
                      <button className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentView.includes('pr') ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                        <GitPullRequest className="w-3 h-3 mr-1 inline" /> Pull requests
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[500px]">
                    {/* Sidebar */}
                    <div className="hidden md:flex flex-col w-64 border-r border-white/10 bg-[#0d1117]/50 p-4 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-500 uppercase">Repositories</div>
                        <div className="text-sm text-white flex items-center gap-2"><BookOpen className="w-4 h-4" /> swe-agent</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-gray-500 uppercase">In this repository</div>
                        <div className={`text-sm flex items-center gap-2 px-2 py-1 rounded-md ${currentView === 'issue' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'}`}><Code className="w-4 h-4" /> Code</div>
                        <div className={`text-sm flex items-center gap-2 px-2 py-1 rounded-md ${currentView === 'issue' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'}`}><AlertCircle className="w-4 h-4" /> Issues</div>
                        <div className={`text-sm flex items-center gap-2 px-2 py-1 rounded-md ${currentView.includes('pr') ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'}`}><GitPullRequest className="w-4 h-4" /> Pull requests <span className="ml-auto bg-gray-700 text-xs px-1.5 rounded-full">1</span></div>
                        <div className="text-sm flex items-center gap-2 px-2 py-1 rounded-md text-gray-400 hover:text-white"><Play className="w-4 h-4" /> Actions</div>
                      </div>

                      <div className="mt-auto p-3 bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-purple-400" />
                          <span className="text-xs font-bold text-white">PiPilot Status</span>
                        </div>
                        <div className="text-xs text-gray-400">{step === 0 ? 'Idle' : 'Active Task: Auth System'}</div>
                        {isAutoPlaying && <div className="w-full bg-gray-700 h-1 mt-2 rounded-full overflow-hidden"><div className="bg-purple-500 h-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: '50%' }}></div></div>}
                      </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 p-0 relative bg-[#0d1117]">

                      {/* VIEW: ISSUE */}
                      {currentView === 'issue' && (
                        <div className="p-6 animate-in fade-in duration-500">
                          {step === 0 && (
                            <div className="text-center py-20">
                              <button onClick={runSimulation} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 mx-auto">
                                <Play className="w-4 h-4" /> Start Simulation
                              </button>
                            </div>
                          )}

                          {step > 0 && (
                            <div>
                              {/* Issue Header */}
                              <div className="flex items-start gap-4 mb-6">
                                <div className="flex-1">
                                  <h1 className="text-2xl font-bold text-white mb-2">Implement JWT Authentication</h1>
                                  <div className="flex items-center gap-3 text-sm text-gray-400">
                                    <span>#402 opened 5 minutes ago by <span className="text-white">dev-user</span></span>
                                    <span className="px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700 text-xs">enhancement</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <img src="https://github.com/github.png" className="w-8 h-8 rounded-full" alt="User" />
                                </div>
                              </div>

                              {/* Issue Description */}
                              <div className="bg-[#161b22] border border-white/10 rounded-lg p-4 mb-8 text-sm text-gray-300">
                                <p>We need to add a secure login system.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                  <li>Implement JWT token generation</li>
                                  <li>Add password hashing (bcrypt)</li>
                                  <li>Create middleware for protected routes</li>
                                </ul>
                              </div>

                              {/* Comments Timeline */}
                              <div className="space-y-4">
                                {/* Initial User Comment */}
                                <div className="flex gap-3">
                                  <img src="https://github.com/github.png" className="w-8 h-8 rounded-full" alt="User" />
                                  <div className="flex-1">
                                    <div className="bg-[#161b22] border border-white/10 rounded-lg p-4 text-sm text-gray-200">
                                      <p>@pipilot-swe-agent Please handle this implementation. We need it done by EOD.</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Bot Comments */}
                                {comments.map((comment, idx) => (
                                  <div key={idx} className="flex gap-3 animate-in slide-in-from-left-2 duration-300">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">Pi</div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-semibold text-white">PiPilot SWE Agent</span>
                                        <span className="text-xs text-gray-500">just now</span>
                                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-xs rounded-full border border-purple-500/20">Bot</span>
                                      </div>
                                      <div className="bg-[#161b22] border border-white/10 rounded-lg p-4 text-sm text-gray-200">
                                        <p className="whitespace-pre-wrap">{comment.text}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                {/* Bot Typing Indicator */}
                                {botTyping && (
                                  <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">Pi</div>
                                    <div className="bg-[#161b22] border border-white/10 rounded-lg p-4 text-sm text-gray-400 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* VIEW: PR LIST */}
                      {currentView === 'pr-list' && (
                        <div className="p-4 animate-in fade-in duration-500">
                          <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-sm font-bold text-white">1 Open</h2>
                            <div className="flex gap-2">
                              <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-xs text-gray-300 border border-white/10">Filters</button>
                              <button className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-md text-xs text-gray-300 border border-white/10">Search</button>
                            </div>
                          </div>

                          {/* PR Item Row */}
                          <div className="flex gap-4 p-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer bg-white/[0.02] border-l-2 border-l-transparent hover:border-l-green-500">
                            <GitPullRequest className="w-4 h-4 text-green-500 mt-1" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors">
                                feat: Add JWT authentication implementation
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                #403 opened 2 minutes ago by <span className="text-purple-400">PiPilot</span>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 rounded-full bg-green-900/20 text-green-400 text-xs border border-green-900/50">feature/auth-jwt</span>
                                <span className="text-xs text-gray-600">+188 -12</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <img src="https://github.com/github.png" className="w-5 h-5 rounded-full" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* VIEW: PR DETAIL */}
                      {currentView === 'pr-detail' && (
                        <div className="animate-in fade-in duration-500">
                          {/* PR Header */}
                          <div className="p-6 border-b border-white/10 bg-[#161b22]/50">
                            <div className="flex items-center gap-2 mb-2">
                              <GitPullRequest className={`w-5 h-5 ${step === 8 ? 'text-purple-500' : 'text-green-500'}`} />
                              <h1 className="text-xl font-bold text-white">feat: Add JWT authentication implementation</h1>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${step === 8 ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}`}>
                                {step === 8 ? 'Merged' : 'Open'}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>#403</span>
                              <span>opened 2 minutes ago by <span className="text-purple-400">PiPilot</span></span>
                            </div>
                          </div>

                          {/* PR Tabs */}
                          <div className="flex border-b border-white/10 px-6 gap-6">
                            <button
                              onClick={() => setActiveTab('conversation')}
                              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'conversation' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                            >
                              Conversation
                            </button>
                            <button
                              onClick={() => setActiveTab('files')}
                              className={`py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'files' ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                            >
                              Files changed
                            </button>
                          </div>

                          <div className="p-6">
                            {/* TAB: CONVERSATION */}
                            {activeTab === 'conversation' && (
                              <div className="max-w-3xl">
                                <div className="text-sm text-gray-300 mb-4">Adding full JWT support with tests.</div>

                                {step >= 8 ? (
                                  <div className="space-y-4">
                                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 text-center animate-in fade-in duration-500">
                                      <CheckCircle className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                                      <div className="text-white font-semibold">Pull request merged successfully</div>
                                      <div className="text-xs text-gray-400 mt-1">Branch feature/auth-jwt deleted</div>
                                    </div>
                                    <div className="flex justify-center gap-3">
                                      <button onClick={resetSimulation} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4" /> Replay Simulation
                                      </button>
                                      <button className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md text-sm font-bold transition-all">
                                        Visit Repository
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex justify-end mt-8">
                                    <button className={`px-6 py-2 rounded-md text-sm font-bold transition-all shadow-lg ${step >= 7 ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}>
                                      Merge pull request
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* TAB: FILES */}
                            {activeTab === 'files' && (
                              <div className="animate-in fade-in duration-500">
                                <div className="text-xs text-gray-400 mb-4 font-mono">Showing 3 changed files with 188 additions and 12 deletions.</div>

                                {/* Diff 1 */}
                                <div className="border border-white/10 rounded-md mb-4 overflow-hidden">
                                  <div className="bg-[#161b22] px-4 py-2 text-xs font-mono text-gray-300 border-b border-white/10 flex justify-between">
                                    <span>src/middleware/auth.js</span>
                                    <span className="text-green-400">+124</span>
                                  </div>
                                  <div className="bg-[#0d1117] p-4 font-mono text-xs overflow-x-auto">
                                    <div className="bg-[#238636]/20 border-l-2 border-[#238636] px-2 py-1 text-gray-300"><span className="text-[#3fb950] select-none mr-2">+1</span><span className="text-[#ff7b72]">const</span> jwt = require(<span className="text-[#a5d6ff]">'jsonwebtoken'</span>);</div>
                                    <div className="bg-[#238636]/20 border-l-2 border-[#238636] px-2 py-1 text-gray-300"><span className="text-[#3fb950] select-none mr-2">+2</span><span className="text-[#ff7b72]">const</span> bcrypt = require(<span className="text-[#a5d6ff]">'bcryptjs'</span>);</div>
                                    <div className="px-2 py-1 text-gray-600">...</div>
                                  </div>
                                </div>

                                {/* Diff 2 */}
                                <div className="border border-white/10 rounded-md mb-4 overflow-hidden">
                                  <div className="bg-[#161b22] px-4 py-2 text-xs font-mono text-gray-300 border-b border-white/10 flex justify-between">
                                    <span>tests/auth.test.js</span>
                                    <span className="text-green-400">+64</span>
                                  </div>
                                  <div className="bg-[#0d1117] p-4 font-mono text-xs overflow-x-auto">
                                    <div className="bg-[#238636]/20 border-l-2 border-[#238636] px-2 py-1 text-gray-300"><span className="text-[#3fb950] select-none mr-2">+1</span>describe(<span className="text-[#a5d6ff]">'Auth Middleware'</span>, () ={'>'}  {'{'}{'}'}</div>
                                    <div className="bg-[#238636]/20 border-l-2 border-[#238636] px-2 py-1 text-gray-300"><span className="text-[#3fb950] select-none mr-2">+2</span>  it(<span className="text-[#a5d6ff]">'should deny access without token'</span>, <span className="text-[#ff7b72]">async</span> () ={'>'}  {'{'}{'}'}</div>
                                    <div className="px-2 py-1 text-gray-600">...</div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </TiltCard>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-10 border-y border-white/5 bg-white/[0.01]">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { val: "10k+", label: "Repos Connected" },
                { val: "99.9%", label: "Accuracy" },
                { val: "0.4s", label: "Latency" },
                { val: "24/7", label: "Uptime" }
              ].map((stat, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <div className="text-center">
                    <div className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{stat.val}</div>
                    <div className="text-sm text-gray-500 uppercase tracking-widest">{stat.label}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section id="workflow" className="py-32 relative">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">From Prompt to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Production</span></h2>
                <p className="text-gray-400 max-w-2xl mx-auto">PiPilot doesn't just write code. It understands context, manages dependencies, and deploys to your cloud provider.</p>
              </div>
            </Reveal>

            <div className="relative max-w-4xl mx-auto">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-purple-600 via-cyan-500 to-transparent transform md:-translate-x-1/2"></div>

              {[
                { icon: Bug, title: "1. Issue Detection", desc: "AI monitors your GitHub issues or listens to a natural language prompt.", color: "border-purple-500 text-purple-500" },
                { icon: Brain, title: "2. Architecture Planning", desc: "It analyzes your existing codebase to propose a structural plan that fits your style.", color: "border-cyan-500 text-cyan-500" },
                { icon: Rocket, title: "3. Execution & Deploy", desc: "Writes the code, runs tests, fixes bugs, and opens a Pull Request automatically.", color: "border-pink-500 text-pink-500" }
              ].map((step, i) => (
                <div key={i} className={`relative flex flex-col md:flex-row items-center justify-between mb-24 group ${i % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
                  <Reveal width="45%" delay={i * 0.2}>
                    <div className={`text-left md:${i % 2 !== 0 ? 'text-left pl-12' : 'text-right pr-12'}`}>
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{step.title}</h3>
                      <p className="text-gray-400">{step.desc}</p>
                    </div>
                  </Reveal>
                  <div className="absolute left-8 md:left-1/2 w-4 h-4 bg-black border-2 border-current rounded-full transform -translate-x-1/2 shadow-lg z-10" style={{ color: step.color.split(' ')[1].replace('text-', '') }}>
                    <div className={`absolute inset-0 rounded-full animate-ping opacity-75 bg-${step.color.split('-')[1]}-400`} style={{ backgroundColor: 'currentColor' }}></div>
                  </div>
                  <Reveal width="45%" delay={i * 0.2 + 0.1}>
                    <div className={`md:${i % 2 !== 0 ? 'pr-12' : 'pl-12'} flex justify-${i % 2 !== 0 ? 'start' : 'end'} pl-20 md:pl-0`}>
                      <div className={`bg-white/5 p-4 rounded-xl border-l-4 ${i % 2 !== 0 ? 'border-l-0 border-r-4' : ''} ${step.color} inline-flex items-center gap-3`}>
                        <step.icon className="w-8 h-8" />
                      </div>
                    </div>
                  </Reveal>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid (3D Tilt) */}
        <section id="features" className="py-32 relative overflow-hidden">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="flex flex-col md:flex-row justify-between items-end mb-16">
                <div className="max-w-2xl">
                  <h2 className="text-4xl md:text-6xl font-display font-bold mb-4">Engineered for <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Performance</span></h2>
                </div>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Code, title: "Context Aware", text: "It reads your entire repo. It understands your specific coding conventions, file structure, and dependencies.", color: "text-purple-500", glow: "bg-purple-600/20" },
                { icon: Shield, title: "Security First", text: "Automated security scanning on every generated line. Detects vulnerabilities before they reach production.", color: "text-cyan-500", glow: "bg-cyan-600/20" },
                { icon: Layers, title: "Self-Healing", text: "If a build fails, PiPilot analyzes the logs, fixes the error, and retries automatically.", color: "text-pink-500", glow: "bg-pink-600/20" }
              ].map((feature, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <TiltCard className="h-full group relative overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition-colors p-8 rounded-3xl">
                    <div className={`absolute top-0 right-0 w-32 h-32 ${feature.glow} blur-[50px] group-hover:opacity-100 transition-all`} />
                    <div className="relative z-10">
                      <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{feature.text}</p>
                    </div>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Showcase Section */}
        <section id="showcase" className="py-32 bg-black/50 relative">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2 block">Visual Evidence</span>
                <h2 className="text-3xl md:text-5xl font-display font-bold text-white">See it in Action</h2>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { src: "/screenshot1.png", title: "GitHub Issue Analysis", desc: "PiPilot analyzing and understanding issue requirements" },
                { src: "/screenshot2.png", title: "Code Generation", desc: "AI generating production-ready code solutions" },
                { src: "/screenshot3.png", title: "Pull Request Creation", desc: "Automated PR creation with complete implementation" }
              ].map((screenshot, index) => (
                <Reveal key={index} delay={index * 0.1}>
                  <div
                    className="group relative rounded-2xl overflow-hidden cursor-pointer"
                    onClick={() => openModal(screenshot)}
                  >
                    <img
                      src={screenshot.src}
                      alt={screenshot.title}
                      className="w-full h-64 object-cover transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <h4 className="text-white font-bold translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{screenshot.title}</h4>
                      <p className="text-gray-300 text-sm translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{screenshot.desc}</p>
                    </div>

                    {/* Click indicator */}
                    <div className="absolute top-4 right-4 w-8 h-8 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-32 relative">
          <div className="container mx-auto px-6">
            <Reveal>
              <div className="text-center mb-16">
                <span className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-2 block">
                  Simple Pricing
                </span>
                <h2 className="text-4xl md:text-6xl font-display font-bold text-white mb-4">
                  Choose Your Plan
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto">
                  Start free and scale as you grow. All plans include full access to our AI SWE Agent.
                </p>
              </div>
            </Reveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  name: "Free",
                  price: "$0",
                  period: "forever",
                  description: "Perfect for getting started",
                  features: [
                    "10 Credits/month",
                    "Community support",
                    "GitHub integration"
                  ],
                  cta: "Get Started Free",
                  popular: false
                },
                {
                  name: "Pro",
                  price: "$30",
                  period: "per month",
                  description: "Most popular for teams",
                  features: [
                    "500 Credits/month",
                    "Premium AI models",
                    "Priority support",
                    "Advanced Code Reviews",

                  ],
                  cta: "Select Pro",
                  popular: true
                },
                {
                  name: "Enterprise",
                  price: "Custom",
                  period: "pricing",
                  description: "For large organizations",
                  features: [
                    "Unlimited tasks",
                    "Dedicated support",
                    "Custom integrations",
                    "SLA guarantee",
                    "On-premise deployment",
                    "Advanced security"
                  ],
                  cta: "Contact Sales",
                  popular: false
                }
              ].map((plan, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <TiltCard
                    className={`relative overflow-visible h-full p-8 rounded-3xl border transition-all duration-300 group ${plan.popular
                        ? 'bg-gradient-to-b from-purple-900/20 to-cyan-900/20 border-purple-500/50 shadow-2xl shadow-purple-500/10 md:-translate-y-2'
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                  >
                    {/* Most Popular Badge */}
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                        <span className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}

                    {/* Header */}
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="flex items-baseline justify-center gap-1 mb-2">
                        <span className="text-4xl font-bold text-white">
                          {plan.price}
                        </span>
                        <span className="text-gray-400">
                          {plan.period}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {plan.description}
                      </p>
                    </div>

                    {/* Features */}
                    <ul className="space-y-4 mb-8">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                          <span className="text-gray-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link href="https://github.com/apps/pipilot-swe-agent" className="block w-full">
                      <button
                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${plan.popular
                            ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-purple-500/25'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                          }`}
                      >
                        {plan.cta}
                      </button>
                    </Link>
                  </TiltCard>
                </Reveal>
              ))}
            </div>

          </div>
        </section>


        {/* CTA Section */}
        <section className="py-32 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent"></div>
          <div className="container mx-auto px-6 text-center relative z-10">
            <Reveal>
              <h2 className="text-5xl md:text-7xl font-display font-bold mb-8 tracking-tighter">Ready to <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-600">Deploy 10x Faster?</span></h2>
              <p className="text-xl text-gray-400 mb-10">Join the revolution of autonomous software engineering.</p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link href="https://github.com/apps/pipilot-swe-agent">
                  <button className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                    Get Started for Free
                  </button>
                </Link>
                <Link href="https://pipilot.dev/enterprise">
                  <button className="px-8 py-4 bg-white/5 text-white font-medium rounded-full hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-sm">
                    Contact Sales
                  </button>
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black pt-20 pb-10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <img src="/logo.png" alt="PiPilot Logo" className=" w-12 h-12" />                <span className="font-display font-bold text-xl tracking-tight text-white">PiPilot</span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                The autonomous AI agent that writes, tests, and deploys production-ready code.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link href="#" className="hover:text-cyan-400 transition-colors">Features</Link></li>
                <li><Link href="https://pipilot.dev/features/integrations" className="hover:text-cyan-400 transition-colors">Integrations</Link></li>
                <li><Link href="#pricing" className="hover:text-cyan-400 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Resources</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                <li><Link href="https://pipilot.dev/docs" className="hover:text-cyan-400 transition-colors">Documentation</Link></li>
                <li><Link href="https://pipilot.dev/blog" className="hover:text-cyan-400 transition-colors">Blog</Link></li>
              </ul>
            </div>


          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">© 2025 PiPilot Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="https://github.com/apps/pipilot-swe-agent" className="text-gray-400 hover:text-white transition-colors">
                <Github className="w-5 h-5" /></a>
              <a href="https://pipilot.dev" className="text-gray-400 hover:text-white transition-colors"><Terminal className="w-5 h-5" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
