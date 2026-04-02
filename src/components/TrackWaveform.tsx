import React, { useEffect, useRef, useState } from 'react';

interface TrackWaveformProps {
  audioBuffer: AudioBuffer | null;
  color?: string;
  volume?: number;
}

export const TrackWaveform: React.FC<TrackWaveformProps> = ({ 
  audioBuffer, 
  color = '#a1a1aa', // zinc-400
  volume = 1
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 64 });

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    
    // Bar styling
    const barWidth = 2 * dpr;
    const gap = 2 * dpr;
    const step = Math.ceil(data.length / (width / (barWidth + gap)));
    const amp = height / 2;
    const visualGain = 1.5 * volume;

    ctx.fillStyle = color;

    for (let i = 0; i < width; i += (barWidth + gap)) {
      let min = 1.0;
      let max = -1.0;
      
      const sampleIndex = Math.floor((i / width) * data.length);
      if (sampleIndex >= data.length) break;

      for (let j = 0; j < step; j++) {
        const datum = data[sampleIndex + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      
      if (min <= max) {
          let yMin = (1 + min * visualGain) * amp;
          let yMax = (1 + max * visualGain) * amp;
          
          yMin = Math.max(0, Math.min(height, yMin));
          yMax = Math.max(0, Math.min(height, yMax));
          
          let barHeight = Math.max(2 * dpr, yMax - yMin);
          let y = amp - (barHeight / 2);

          // Draw rounded rectangle
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(i, y, barWidth, barHeight, barWidth / 2);
          } else {
            ctx.rect(i, y, barWidth, barHeight);
          }
          ctx.fill();
      }
    }
  }, [audioBuffer, color, dimensions, volume]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};
