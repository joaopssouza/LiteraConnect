'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomVideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
}

export function CustomVideoPlayer({ src, className, autoPlay = false }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  let controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
      setProgress((video.currentTime / video.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2500);
  };

  const handleMouseLeave = () => {
    if (isPlaying) setShowControls(false);
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(err => console.log(err));
    } else {
      await document.exitFullscreen();
    }
  };

  const [isDragging, setIsDragging] = useState(false);
  const scrubberRef = useRef<HTMLDivElement>(null);

  const updateProgressFromEvent = (e: React.MouseEvent | MouseEvent) => {
    if (!videoRef.current || !scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * videoRef.current.duration;
    setProgress(pos * 100);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    updateProgressFromEvent(e);
  };

  useEffect(() => {
    const handleMouseMoveDoc = (e: MouseEvent) => {
      if (isDragging) {
        updateProgressFromEvent(e);
      }
    };
    const handleMouseUpDoc = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMoveDoc);
      document.addEventListener('mouseup', handleMouseUpDoc);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveDoc);
      document.removeEventListener('mouseup', handleMouseUpDoc);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={cn("relative group overflow-hidden bg-black flex items-center justify-center", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full max-h-[80vh] object-contain"
        autoPlay={autoPlay}
        muted={isMuted}
        playsInline
        loop
      />

      {/* Overlay Escuro quando pausado */}
      {!isPlaying && (
        <div className="absolute inset-0 bg-black/30 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center animate-in zoom-in shadow-lg">
            <Play className="w-6 h-6 text-white translate-x-0.5" fill="currentColor" />
          </div>
        </div>
      )}

      {/* Controles do Player */}
      <div 
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-16 pb-2 px-3 transition-all duration-300",
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}
        onClick={e => e.stopPropagation()} // impede que clique nos controles pause o vídeo
      >
        {/* Barra de Progresso (Scrubber) */}
        <div 
          ref={scrubberRef}
          className="h-4 w-full cursor-pointer relative group/scrubber flex items-center mb-1"
          onMouseDown={handleMouseDown}
        >
          <div className="w-full h-1 group-hover/scrubber:h-1.5 transition-all duration-100 bg-white/30 relative">
            <div 
              className="absolute top-0 left-0 bottom-0 bg-brand-2"
              style={{ width: `${progress}%`, transition: isDragging ? 'none' : 'width 0.1s' }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-brand-2 rounded-full scale-0 group-hover/scrubber:scale-100 transition-transform duration-100" />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between text-white px-1">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="hover:text-brand-2 transition-colors">
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
            </button>
            
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:text-brand-2 transition-colors">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            <span className="text-xs font-medium ml-2 opacity-90 tracking-wide">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          <button onClick={toggleFullscreen} className="hover:text-brand-2 transition-colors">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
