"use client"

import { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Database, Building2, Users, Server, Workflow, Figma, Cpu, Shield, Bot, FolderOpen, Import, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  {
    id: "pipilot-db",
    title: "PiPilot DB",
    description: "Deep AI integration database with intelligent query processing. Ask questions in plain English and get instant results.",
    icon: <Database className="w-8 h-8 text-blue-500" />,
    secondaryIcon: <Cpu className="w-6 h-6 text-blue-400" />,
    badges: ["AI-Powered", "New"],
    highlights: ["Natural language queries", "Smart auto-indexing", "Real-time analytics", "AI-powered insights"],
    cta: "Explore Database",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    id: "pipilot-enterprise",
    title: "PiPilot Enterprise",
    description: "Enterprise-grade solutions with advanced security and scalability. Deploy with confidence at enterprise scale.",
    icon: <Building2 className="w-8 h-8 text-purple-500" />,
    secondaryIcon: <Shield className="w-6 h-6 text-purple-400" />,
    badges: ["Enterprise", "Secure"],
    highlights: ["Single Sign-On (SSO)", "Advanced permissions", "Compliance ready", "Enterprise support"],
    cta: "Start Enterprise Trial",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    id: "pipilot-teams",
    title: "PiPilot Teams",
    description: "Collaborative workspace for team development and sharing. Perfect for distributed teams.",
    icon: <Users className="w-8 h-8 text-green-500" />,
    secondaryIcon: <Users className="w-6 h-6 text-green-400" />,
    badges: ["Collaboration", "Real-time"],
    highlights: ["Live collaboration", "Shared workspaces", "Team permissions", "Real-time sync"],
    cta: "Create Team Workspace",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    id: "mcp-server",
    title: "PiPilot DB MCP Server",
    description: "Connect AI agents directly to your database with MCP protocol. The future of AI-agent-database integration.",
    icon: <Server className="w-8 h-8 text-orange-500" />,
    secondaryIcon: <Bot className="w-6 h-6 text-orange-400" />,
    badges: ["Coming Soon", "AI Agents"],
    highlights: ["MCP protocol support", "AI agent integration", "Secure connections", "Real-time data access"],
    cta: "Join Waitlist",
    gradient: "from-orange-500 to-red-500"
  },
  {
    id: "teams-workspace",
    title: "Teams Workspace",
    description: "Organize projects, manage permissions, and track team progress with advanced workspace management tools.",
    icon: <Workflow className="w-8 h-8 text-indigo-500" />,
    secondaryIcon: <FolderOpen className="w-6 h-6 text-indigo-400" />,
    badges: ["Workspace", "Management"],
    highlights: ["Project organization", "Permission management", "Progress tracking", "Team analytics"],
    cta: "Manage Workspaces",
    gradient: "from-indigo-500 to-blue-500"
  },
  {
    id: "figma-import",
    title: "Figma Import",
    description: "Convert Figma designs into functional code instantly. Bridge the gap between design and development.",
    icon: <Figma className="w-8 h-8 text-pink-500" />,
    secondaryIcon: <Import className="w-6 h-6 text-pink-400" />,
    badges: ["Design", "Import"],
    highlights: ["One-click import", "Design-to-code conversion", "Component extraction", "Style preservation"],
    cta: "Import from Figma",
    gradient: "from-pink-500 to-rose-500"
  }
];

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export default function PiPilotFeaturesSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [cardsPerSlide, setCardsPerSlide] = useState(1);

  // Responsive cards per slide
  useEffect(() => {
    const updateCardsPerSlide = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setCardsPerSlide(3); // lg: 3 cards
      } else if (width >= 768) {
        setCardsPerSlide(2); // md: 2 cards
      } else {
        setCardsPerSlide(1); // sm: 1 card
      }
    };

    updateCardsPerSlide();
    window.addEventListener('resize', updateCardsPerSlide);
    return () => window.removeEventListener('resize', updateCardsPerSlide);
  }, []);

  const totalSlides = Math.ceil(features.length / cardsPerSlide);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying || isHovered) return;

    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, isHovered, nextSlide]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="w-full max-w-7xl relative z-10 px-4 md:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="mb-2 flex items-center justify-center gap-1 text-xl font-medium leading-none text-white sm:text-2xl md:mb-2.5 md:gap-0 md:text-5xl">
            <span className="pt-0.5 tracking-tight md:pt-0">PiPilot Features</span>
          </h1>
          <p className="text-slate-400 text-xl md:text-2xl font-light">
            Explore our powerful suite of tools
          </p>
        </motion.div>

        {/* Slider Container */}
        <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
          {/* Navigation Buttons */}
          <Button
            onClick={prevSlide}
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-30 rounded-full bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20 shadow-2xl shadow-black/50 transition-all duration-300 hover:shadow-blue-500/30 md:-translate-x-6 lg:-translate-x-16 hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </Button>

          <Button
            onClick={nextSlide}
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-30 rounded-full bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20 shadow-2xl shadow-black/50 transition-all duration-300 hover:shadow-blue-500/30 md:translate-x-6 lg:translate-x-16 hover:scale-110 active:scale-95"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </Button>

          {/* Cards wrapper with overflow hidden */}
          <div className="overflow-hidden">

          {/* Auto-play toggle */}
          <Button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            variant="outline"
            size="icon"
            className="absolute top-4 right-4 z-30 rounded-full bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/20 shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            {isAutoPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white" />}
          </Button>

          {/* Cards wrapper with overflow hidden */}
          <div className="overflow-hidden">
          {/* Feature Cards Grid */}
          <motion.div
            animate={{ x: `${-currentIndex * 100}%` }}
            transition={{
              type: "tween",
              duration: 0.4,
              ease: "easeInOut",
            }}
            className="flex"
          >
            {features.map((feature, featureIndex) => (
              <div 
                key={feature.id} 
                style={{ 
                  flex: `0 0 ${100 / cardsPerSlide}%`, 
                  paddingLeft: featureIndex % cardsPerSlide === 0 ? '0' : '12px', 
                  paddingRight: (featureIndex + 1) % cardsPerSlide === 0 ? '0' : '12px' 
                }} 
                className="box-border"
              >
                <Card className="border-white/10 bg-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-3xl hover:shadow-blue-500/20 h-full">
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.6 }}
                            className="relative"
                          >
                            {feature.icon}
                            <motion.div
                              className="absolute -bottom-1 -right-1"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.4 + featureIndex * 0.1, type: "spring", stiffness: 500 }}
                            >
                              {feature.secondaryIcon}
                            </motion.div>
                          </motion.div>
                        </div>
                        <div>
                          <CardTitle className="text-xl md:text-2xl text-white font-bold">
                            {feature.title}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {feature.badges.map((badge, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm px-2 py-1 text-xs font-medium"
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <CardDescription className="text-slate-300 text-sm md:text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-grow">
                    <div className="grid grid-cols-1 gap-2">
                      {feature.highlights.map((highlight, idx) => (
                        <motion.div
                          key={idx}
                          whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
                          className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group/item"
                        >
                          <motion.div
                            className={`w-2 h-2 rounded-full bg-gradient-to-r ${feature.gradient}`}
                            whileHover={{ scale: 1.3 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          ></motion.div>
                          <span className="text-slate-200 text-xs md:text-sm group-hover/item:text-white transition-colors">
                            {highlight}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-full"
                    >
                      <Button
                        className={`w-full bg-gradient-to-r ${feature.gradient} hover:opacity-90 text-white shadow-lg shadow-blue-500/20 font-semibold px-4 py-2 text-sm md:text-base transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30`}
                      >
                        {feature.cta}
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </motion.div>
          </div>

          </div>

          {/* Progress Indicators */}
          <motion.div
            className="flex gap-3 justify-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            {Array.from({ length: totalSlides }, (_, idx) => (
              <motion.button
                key={idx}
                onClick={() => goToSlide(idx)}
                className={`h-3 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'w-12 bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg'
                    : 'w-3 bg-white/20 hover:bg-white/40'
                }`}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                animate={idx === currentIndex ? { scale: 1.1 } : { scale: 1 }}
              />
            ))}
          </motion.div>
        </div>

        {/* Counter */}
        <motion.div
          className="text-center mt-8 text-slate-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <span className="text-xl font-medium bg-white/5 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
            {currentIndex + 1} / {totalSlides}
          </span>
        </motion.div>

        {/* Keyboard hint */}
        <motion.div
          className="text-center mt-4 text-slate-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          Use arrow keys to navigate • Space to pause/play
        </motion.div>
      </div>
    </div>
  );
}