import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

interface WaveformEditorProps {
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  selection: { start: number, end: number } | null;
  onSelectionChange: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

export const WaveformEditor: React.FC<WaveformEditorProps> = ({ 
  audioBuffer, 
  currentTime, 
  selection,
  onSelectionChange,
  onSeek
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Removed local selection state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  
  // Zoom and Scroll State
  const [zoom, setZoom] = useState(1); // 1 = fit to screen, > 1 = zoomed in
  const [scrollOffset, setScrollOffset] = useState(0); // in seconds

  // Draw Waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const duration = audioBuffer.duration;
    
    // Calculate visible window
    const visibleDuration = duration / zoom;
    const startSample = Math.floor(scrollOffset * audioBuffer.sampleRate);
    const endSample = Math.min(data.length, Math.floor((scrollOffset + visibleDuration) * audioBuffer.sampleRate));
    const visibleSamples = endSample - startSample;
    
    // Draw Waveform
    ctx.beginPath();
    ctx.strokeStyle = '#52525b'; // zinc-600
    ctx.lineWidth = 1;

    const step = Math.ceil(visibleSamples / width);
    const amp = height / 2;

    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      
      const sampleIndex = startSample + (i * step);
      if (sampleIndex >= data.length) break;

      for (let j = 0; j < step; j++) {
        const datum = data[sampleIndex + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      // Optimization: if min > max (no data), skip
      if (min <= max) {
          ctx.moveTo(i, (1 + min) * amp);
          ctx.lineTo(i, (1 + max) * amp);
      }
    }
    ctx.stroke();

    // Helper to convert time to x position
    const timeToX = (time: number) => {
      return ((time - scrollOffset) / visibleDuration) * width;
    };

    // Draw Selection
    if (selection) {
      const startX = timeToX(selection.start);
      const endX = timeToX(selection.end);
      const selWidth = endX - startX;

      // Only draw if visible
      if (endX > 0 && startX < width) {
          ctx.fillStyle = 'rgba(249, 115, 22, 0.3)'; // orange-500 with opacity
          ctx.fillRect(startX, 0, selWidth, height);
          
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 2;
          ctx.strokeRect(startX, 0, selWidth, height);
      }
    }

    // Draw Playhead
    const playheadX = timeToX(currentTime);
    if (playheadX >= 0 && playheadX <= width) {
        ctx.beginPath();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
    }

  }, [audioBuffer, selection, currentTime, zoom, scrollOffset]);

  // Handle Zoom
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.5, 50)); // Max zoom 50x
  };

  const handleZoomOut = () => {
    setZoom(prev => {
        const newZoom = Math.max(prev / 1.5, 1);
        if (newZoom === 1) setScrollOffset(0); // Reset scroll if zoomed out fully
        return newZoom;
    });
  };

  // Handle Scroll (Wheel)
  const handleWheel = (e: React.WheelEvent) => {
    if (zoom === 1 || !audioBuffer) return;
    
    // e.deltaY > 0 means scroll down (move right in time)
    // e.deltaY < 0 means scroll up (move left in time)
    
    const duration = audioBuffer.duration;
    const visibleDuration = duration / zoom;
    const scrollAmount = (visibleDuration / 10) * (e.deltaY > 0 ? 1 : -1);
    
    setScrollOffset(prev => {
        const newOffset = Math.max(0, Math.min(prev + scrollAmount, duration - visibleDuration));
        return newOffset;
    });
  };

  const getTimestampFromEvent = (e: React.MouseEvent) => {
    if (!containerRef.current || !audioBuffer) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    const visibleDuration = audioBuffer.duration / zoom;
    return scrollOffset + (percentage * visibleDuration);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const time = getTimestampFromEvent(e);
    setDragStart(time);
    setIsDragging(true);
    onSelectionChange(time, time);
    onSeek(time);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || dragStart === null || !audioBuffer) return;
    
    const time = getTimestampFromEvent(e);
    const start = Math.min(dragStart, time);
    const end = Math.max(dragStart, time);
    
    onSelectionChange(start, end);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <div className="space-y-2">
        <div 
          ref={containerRef}
          className="relative h-32 w-full bg-zinc-900 rounded-lg overflow-hidden cursor-crosshair border border-zinc-800"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        >
          <canvas
            ref={canvasRef}
            width={containerRef.current?.clientWidth || 800}
            height={128}
            className="w-full h-full"
          />
        </div>
        
        {/* Zoom Controls */}
        <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleZoomOut}
                    disabled={zoom === 1}
                    className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-zinc-500 font-mono">{Math.round(zoom * 100)}%</span>
                <button 
                    onClick={handleZoomIn}
                    className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white"
                    title="Zoom In"
                >
                    <ZoomIn className="w-4 h-4" />
                </button>
            </div>
            {zoom > 1 && (
                <div className="text-xs text-zinc-500">
                    גלול כדי לנוע בזמן
                </div>
            )}
        </div>
    </div>
  );
};
