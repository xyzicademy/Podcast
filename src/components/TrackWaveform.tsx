import React, { useEffect, useRef, useState } from 'react';

interface TrackWaveformProps {
  audioBuffer: AudioBuffer | null;
  color?: string;
  volume?: number;
  sourceStart?: number;
  duration?: number;
}

export const TrackWaveform: React.FC<TrackWaveformProps> = ({ 
  audioBuffer, 
  color = '#a1a1aa', // zinc-400
  volume = 1,
  sourceStart = 0,
  duration
}) => {
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

  const MAX_CANVAS_WIDTH = 4000;
  const numCanvases = Math.max(1, Math.ceil(dimensions.width / MAX_CANVAS_WIDTH));
  const canvasWidths = Array.from({ length: numCanvases }, (_, i) => {
    if (i === numCanvases - 1) {
      return dimensions.width - (i * MAX_CANVAS_WIDTH);
    }
    return MAX_CANVAS_WIDTH;
  });

  return (
    <div ref={containerRef} className="w-full h-full flex">
      {canvasWidths.map((cWidth, index) => (
        <WaveformChunk
          key={index}
          width={cWidth}
          height={dimensions.height}
          audioBuffer={audioBuffer}
          color={color}
          volume={volume}
          sourceStart={sourceStart}
          duration={duration}
          totalWidth={dimensions.width}
          offsetX={index * MAX_CANVAS_WIDTH}
        />
      ))}
    </div>
  );
};

interface WaveformChunkProps {
  width: number;
  height: number;
  audioBuffer: AudioBuffer | null;
  color: string;
  volume: number;
  sourceStart: number;
  duration?: number;
  totalWidth: number;
  offsetX: number;
}

const WaveformChunk: React.FC<WaveformChunkProps> = ({
  width, height, audioBuffer, color, volume, sourceStart, duration, totalWidth, offsetX
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    
    const startSample = Math.floor(sourceStart * sampleRate);
    const trackDuration = duration !== undefined ? duration : audioBuffer.duration - sourceStart;
    const durationSamples = Math.floor(trackDuration * sampleRate);
    
    const barWidth = 2 * dpr;
    const gap = 2 * dpr;
    const step = Math.ceil(durationSamples / (totalWidth / ((barWidth + gap) / dpr)));
    const amp = canvas.height / 2;
    const visualGain = 1.5 * volume;

    ctx.fillStyle = color;

    for (let i = 0; i < canvas.width; i += (barWidth + gap)) {
      let min = 1.0;
      let max = -1.0;
      
      const globalX = (offsetX * dpr) + i;
      const sampleIndex = startSample + Math.floor((globalX / (totalWidth * dpr)) * durationSamples);
      
      if (sampleIndex >= data.length || sampleIndex >= startSample + durationSamples) break;

      for (let j = 0; j < step; j++) {
        const datum = data[sampleIndex + j];
        if (datum !== undefined) {
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
      }
      
      if (min <= max) {
          let yMin = (1 + min * visualGain) * amp;
          let yMax = (1 + max * visualGain) * amp;
          
          yMin = Math.max(0, Math.min(canvas.height, yMin));
          yMax = Math.max(0, Math.min(canvas.height, yMax));
          
          let barHeight = Math.max(2 * dpr, yMax - yMin);
          let y = amp - (barHeight / 2);

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(i, y, barWidth, barHeight, barWidth / 2);
          } else {
            ctx.rect(i, y, barWidth, barHeight);
          }
          ctx.fill();
      }
    }
  }, [width, height, audioBuffer, color, volume, sourceStart, duration, totalWidth, offsetX]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};
