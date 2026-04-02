import React, { useState, useEffect, useRef } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  color?: string;
}

export const Knob: React.FC<KnobProps> = ({ 
  label, 
  value, 
  min = 0, 
  max = 100, 
  onChange,
  color = '#F27D26' 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    startYRef.current = e.touches[0].clientY;
    startValueRef.current = value;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = startYRef.current - e.clientY;
      const range = max - min;
      const deltaValue = (deltaY / 200) * range; // 200px drag for full range
      
      let newValue = startValueRef.current + deltaValue;
      newValue = Math.max(min, Math.min(max, newValue));
      
      onChange(newValue);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault(); // Prevent scrolling
      
      const deltaY = startYRef.current - e.touches[0].clientY;
      const range = max - min;
      const deltaValue = (deltaY / 200) * range;
      
      let newValue = startValueRef.current + deltaValue;
      newValue = Math.max(min, Math.min(max, newValue));
      
      onChange(newValue);
    };

    const handleEnd = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, min, max, onChange]);

  // Calculate rotation (-135deg to 135deg)
  const percentage = (value - min) / (max - min);
  const rotation = -135 + (percentage * 270);

  return (
    <div className="flex flex-col items-center gap-2 select-none touch-none">
      <div 
        className="relative w-16 h-16 rounded-full bg-zinc-800 shadow-lg cursor-ns-resize border border-zinc-700"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        {/* Indicator Line */}
        <div 
          className="absolute w-1 h-1/2 left-1/2 top-1 origin-bottom transform -translate-x-1/2 transition-transform duration-75 ease-out"
          style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
        >
          <div className="w-full h-3 bg-white rounded-full mt-1" style={{ backgroundColor: color }}></div>
        </div>
        
        {/* Center Cap */}
        <div className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 shadow-inner"></div>
      </div>
      
      <div className="text-center">
        <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">{label}</div>
        <input 
          type="number" 
          value={Math.round(value)} 
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChange(val); // Allow typing any value, it will be clamped on blur or next render if needed
            }
          }}
          onBlur={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) {
              onChange(Math.max(min, Math.min(max, val)));
            }
          }}
          className="w-12 text-xs font-mono text-zinc-300 bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-center focus:outline-none focus:border-zinc-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        />
      </div>
    </div>
  );
};
