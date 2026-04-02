import React, { useRef, useState, useEffect } from 'react';
import { Track, Channel, Marker } from '../hooks/useAudioProcessor';
import { Trash2, Split, Plus, Minus, Lock, Unlock, ZoomIn, ZoomOut, Maximize, ChevronLeft, ChevronRight, SkipBack, SkipForward, Edit2, Check, Copy, Volume2, VolumeX, Scissors, MapPin, Crop, Play, Pause, ChevronFirst, ChevronLast } from 'lucide-react';
import { TrackWaveform } from './TrackWaveform';

interface MultiTrackTimelineProps {
  tracks: Track[];
  channels: Channel[];
  markers: Marker[];
  currentTime: number;
  duration: number;
  onTrackUpdate: (id: string, updates: Partial<Track>) => void;
  onSeek: (time: number) => void;
  selectedTrackId: string | null;
  onSelectTrack: (id: string) => void;
  onDuplicateTrack: (id: string) => void;
  onAutoTrim: () => void;
  onDeleteTrack: (id: string) => void;
  onTrackReorder: (newTracks: Track[]) => void;
  onSplitTrack: (id: string, time: number) => void;
  onAddChannel: () => void;
  onRemoveChannel: (channelId: string) => void;
  onUpdateChannel: (channelId: string, name: string) => void;
  onReorderChannels: (channels: Channel[]) => void;
  onToggleLock: (id: string) => void;
  onAddMarker: (time: number) => void;
  onRemoveMarker: (id: string) => void;
  onUpdateMarker: (id: string, updates: Partial<Marker>) => void;
  onTrackDragEnd?: () => void;
  onDeleteRegion?: (start: number, end: number) => void;
  onTrimRegion?: (start: number, end: number) => void;
  isPlaying?: boolean;
  onTogglePlayback?: () => void;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  channels,
  currentTime,
  duration,
  onTrackUpdate,
  onSeek,
  selectedTrackId,
  onSelectTrack,
  onDuplicateTrack,
  onAutoTrim,
  onDeleteTrack,
  onTrackReorder,
  onSplitTrack,
  onAddChannel,
  onRemoveChannel,
  onUpdateChannel,
  onReorderChannels,
  onToggleLock,
  markers,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onTrackDragEnd,
  onDeleteRegion,
  onTrimRegion,
  isPlaying = false,
  onTogglePlayback
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [draggingTrackId, setDraggingTrackId] = useState<string | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const [resizingTrackId, setResizingTrackId] = useState<string | null>(null);
  const [resizeHandle, setResizeHandle] = useState<'left' | 'right' | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [initialStartTime, setInitialStartTime] = useState(0);
  const [initialSourceStart, setInitialSourceStart] = useState(0);
  const [initialDuration, setInitialDuration] = useState(0);
  const [initialChannelId, setInitialChannelId] = useState('');
  const [snapLine, setSnapLine] = useState<{x: number, y: number} | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
  const [editChannelName, setEditChannelName] = useState('');
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editMarkerLabel, setEditMarkerLabel] = useState('');

  const [editingTime, setEditingTime] = useState(false);
  const [timeInputValue, setTimeInputValue] = useState('');

  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);
  const selectionStartRef = useRef<number | null>(null);
  const selectionEndRef = useRef<number | null>(null);

  useEffect(() => {
    selectionStartRef.current = selectionStart;
  }, [selectionStart]);

  useEffect(() => {
    selectionEndRef.current = selectionEnd;
  }, [selectionEnd]);

  const [isSelecting, setIsSelecting] = useState(false);

  const timelineDuration = Math.max(duration, 10);
  const pixelsPerSecond = 50 * zoomLevel;
  const timelineWidth = timelineDuration * pixelsPerSecond;

  const handleMouseDown = (e: React.MouseEvent, track: Track) => {
    e.stopPropagation();
    onSelectTrack(track.id);
    
    if (e.shiftKey) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = Math.max(0, x / pixelsPerSecond);
      
      setSelectionStart(time);
      setSelectionEnd(time);
      setIsSelecting(true);
      onSeek(time);
      return;
    }

    setDraggingTrackId(track.id);
    setDragStartX(e.clientX);
    setDragStartY(e.clientY);
    setInitialStartTime(track.startTime);
    setInitialChannelId(track.channelId);
  };

  const handleTouchStart = (e: React.TouchEvent, track: Track) => {
    e.stopPropagation();
    onSelectTrack(track.id);
    
    const touch = e.touches[0];
    setDraggingTrackId(track.id);
    setDragStartX(touch.clientX);
    setDragStartY(touch.clientY);
    setInitialStartTime(track.startTime);
    setInitialChannelId(track.channelId);
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    if (draggingMarkerId) {
      const x = clientX - rect.left;
      const newTime = Math.max(0, x / pixelsPerSecond);
      onUpdateMarker(draggingMarkerId, { time: newTime });
      return;
    }

    if (isSelecting && selectionStart !== null) {
      const x = clientX - rect.left;
      setSelectionEnd(Math.max(0, x / pixelsPerSecond));
      return;
    }

    if (resizingTrackId && resizeHandle) {
      const track = tracks.find(t => t.id === resizingTrackId);
      if (!track || track.locked) return;

      const deltaX = clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (resizeHandle === 'left') {
        // Moving left edge
        let newStartTime = initialStartTime + deltaTime;
        let newSourceStart = initialSourceStart + deltaTime;
        let newDuration = initialDuration - deltaTime;

        // Constraints
        if (newSourceStart < 0) {
          newStartTime -= newSourceStart;
          newDuration += newSourceStart;
          newSourceStart = 0;
        }
        if (newDuration < 0.1) {
          newStartTime = initialStartTime + initialDuration - 0.1;
          newSourceStart = initialSourceStart + initialDuration - 0.1;
          newDuration = 0.1;
        }

        onTrackUpdate(resizingTrackId, {
          startTime: newStartTime,
          sourceStart: newSourceStart,
          duration: newDuration
        });
      } else {
        // Moving right edge
        let newDuration = initialDuration + deltaTime;

        // Constraints
        if (initialSourceStart + newDuration > track.buffer.duration) {
          newDuration = track.buffer.duration - initialSourceStart;
        }
        if (newDuration < 0.1) {
          newDuration = 0.1;
        }

        onTrackUpdate(resizingTrackId, {
          duration: newDuration
        });
      }
      return;
    }

    if (!draggingTrackId) return;
    
    const track = tracks.find(t => t.id === draggingTrackId);
    if (track?.locked) return;
    
    const deltaX = clientX - dragStartX;
    const deltaTime = deltaX / pixelsPerSecond;
    const deltaY = clientY - dragStartY;
    
    let newStartTime = Math.max(0, initialStartTime + deltaTime);
    
    const initialChannelIndex = channels.findIndex(c => c.id === initialChannelId);
    let newChannelIndex = initialChannelIndex + Math.round(deltaY / 80);
    newChannelIndex = Math.max(0, Math.min(channels.length - 1, newChannelIndex));
    const newChannelId = channels[newChannelIndex].id;
    
    // Collision detection
    const isOverlapping = tracks.some(t => 
        t.id !== draggingTrackId && 
        t.channelId === newChannelId &&
        newStartTime < t.startTime + t.duration &&
        newStartTime + (tracks.find(tr => tr.id === draggingTrackId)?.duration || 0) > t.startTime
    );
    
    if (isOverlapping) {
        return;
    }

    // Snapping logic
    const SNAP_THRESHOLD = 0.2; // seconds
    let snapped = false;
    
    for (const t of tracks) {
      if (t.id === draggingTrackId) continue;
      
      const trackEnd = t.startTime + t.duration;
      
      if (Math.abs(newStartTime - t.startTime) < SNAP_THRESHOLD) {
        newStartTime = t.startTime;
        snapped = true;
      } else if (Math.abs(newStartTime - trackEnd) < SNAP_THRESHOLD) {
        newStartTime = trackEnd;
        snapped = true;
      }
    }
    
    if (snapped) {
      setSnapLine({ x: newStartTime * pixelsPerSecond, y: newChannelIndex * 80 + 10 });
    } else {
      setSnapLine(null);
    }
    
    onTrackUpdate(draggingTrackId, { startTime: newStartTime, channelId: newChannelId });
  };

  const handleEnd = () => {
    if (draggingTrackId || resizingTrackId || draggingMarkerId) {
      if (onTrackDragEnd) onTrackDragEnd();
    }
    setDraggingTrackId(null);
    setResizingTrackId(null);
    setDraggingMarkerId(null);
    setResizeHandle(null);
    setSnapLine(null);
    if (isSelecting) {
      setIsSelecting(false);
      // If selection is too small, clear it
      const start = selectionStartRef.current;
      const end = selectionEndRef.current;
      if (start !== null && end !== null && Math.abs(end - start) < 0.05) {
        setSelectionStart(null);
        setSelectionEnd(null);
      }
    }
  };

  useEffect(() => {
    if (draggingTrackId || resizingTrackId || isSelecting || draggingMarkerId) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [draggingTrackId, resizingTrackId, resizeHandle, dragStartX, dragStartY, initialStartTime, initialSourceStart, initialDuration, initialChannelId, zoomLevel, tracks, channels, isSelecting, draggingMarkerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 0.05 && selectedTrackId) {
          e.preventDefault();
          if (onDeleteRegion) onDeleteRegion(selectionStart, selectionEnd);
          setSelectionStart(null);
          setSelectionEnd(null);
        } else if (selectedTrackId) {
          e.preventDefault();
          if (onDeleteTrack) onDeleteTrack(selectedTrackId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectionStart, selectionEnd, selectedTrackId, onDeleteRegion, onDeleteTrack]);

  const handleTimelineMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const isRuler = (e.target as HTMLElement).closest('.ruler-element');
    const isTrack = (e.target as HTMLElement).closest('.track-element');
    
    // Only start selection if clicking on the background, the ruler, or holding Shift on a track
    if (isTrack && !e.shiftKey && !isRuler) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = Math.max(0, x / pixelsPerSecond);
    
    setSelectionStart(time);
    setSelectionEnd(time);
    setIsSelecting(true);
    onSeek(time);
  };

  const handleTimelineTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const isRuler = (e.target as HTMLElement).closest('.ruler-element');
    const isTrack = (e.target as HTMLElement).closest('.track-element');
    
    if (isTrack && !isRuler) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const time = Math.max(0, x / pixelsPerSecond);
    
    setSelectionStart(time);
    setSelectionEnd(time);
    setIsSelecting(true);
    onSeek(time);
  };

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isSelecting || (selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 0.05)) return;
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    onSeek(x / pixelsPerSecond);
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTimeInputSubmit = () => {
    setEditingTime(false);
    const parts = timeInputValue.split(':');
    let totalSeconds = 0;
    
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10) || 0;
      const secs = parseFloat(parts[1]) || 0;
      totalSeconds = mins * 60 + secs;
    } else if (parts.length === 1) {
      totalSeconds = parseFloat(parts[0]) || 0;
    }
    
    onSeek(Math.max(0, Math.min(duration, totalSeconds)));
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTimeInputSubmit();
    } else if (e.key === 'Escape') {
      setEditingTime(false);
    }
  };

  const renderRuler = () => {
    const marks = [];
    const step = zoomLevel > 2 ? 1 : zoomLevel > 1 ? 5 : 10;
    for (let i = 0; i <= timelineDuration; i += step) {
      marks.push(
        <div 
          key={i} 
          className="absolute top-0 bottom-0 border-l border-zinc-700/50 flex flex-col"
          style={{ left: `${i * pixelsPerSecond}px` }}
        >
          <span className="text-[10px] text-zinc-500 ml-1 mt-1 select-none">{formatTime(i)}</span>
        </div>
      );
    }
    return marks;
  };

  const handleResizeStart = (e: React.MouseEvent, track: Track, handle: 'left' | 'right') => {
    e.stopPropagation();
    onSelectTrack(track.id);
    setResizingTrackId(track.id);
    setResizeHandle(handle);
    setDragStartX(e.clientX);
    setInitialStartTime(track.startTime);
    setInitialSourceStart(track.sourceStart);
    setInitialDuration(track.duration);
  };

  const handleResizeTouchStart = (e: React.TouchEvent, track: Track, handle: 'left' | 'right') => {
    e.stopPropagation();
    onSelectTrack(track.id);
    setResizingTrackId(track.id);
    setResizeHandle(handle);
    const touch = e.touches[0];
    setDragStartX(touch.clientX);
    setInitialStartTime(track.startTime);
    setInitialSourceStart(track.sourceStart);
    setInitialDuration(track.duration);
  };

  const moveChannel = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= channels.length) return;
    const newChannels = [...channels];
    const temp = newChannels[index];
    newChannels[index] = newChannels[index + direction];
    newChannels[index + direction] = temp;
    onReorderChannels(newChannels);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2 select-none" dir="ltr">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-4">
            <div className="text-xs text-zinc-500 font-mono flex items-center">
                {editingTime ? (
                    <input
                        autoFocus
                        type="text"
                        value={timeInputValue}
                        onChange={(e) => setTimeInputValue(e.target.value)}
                        onBlur={handleTimeInputSubmit}
                        onKeyDown={handleTimeKeyDown}
                        className="bg-zinc-900 text-white border border-zinc-700 rounded px-1 w-16 text-center"
                        placeholder="0:00.00"
                    />
                ) : (
                    <span 
                        className="cursor-pointer hover:text-white transition-colors"
                        onClick={() => {
                            setTimeInputValue(formatTime(currentTime));
                            setEditingTime(true);
                        }}
                        title="לחץ לעריכת זמן מדויקת"
                    >
                        {formatTime(currentTime)}
                    </span>
                )}
                <span className="mx-2">/</span>
                <span>{formatTime(duration)}</span>
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center gap-1 bg-zinc-800 rounded p-1">
                <button onClick={() => onSeek(0)} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="התחלה"><SkipBack className="w-4 h-4"/></button>
                <button onClick={() => onSeek(Math.max(0, currentTime - 0.1))} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="-0.1 שניה"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => onSeek(Math.max(0, currentTime - 0.01))} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="-0.01 שניה"><ChevronFirst className="w-4 h-4 opacity-70"/></button>
                
                <button 
                    onClick={onTogglePlayback} 
                    className="p-1.5 bg-orange-500 hover:bg-orange-400 rounded-full text-white mx-1 shadow-sm"
                    title={isPlaying ? "השהה" : "נגן"}
                >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>

                <button onClick={() => onSeek(Math.min(duration, currentTime + 0.01))} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="+0.01 שניה"><ChevronLast className="w-4 h-4 opacity-70"/></button>
                <button onClick={() => onSeek(Math.min(duration, currentTime + 0.1))} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="+0.1 שניה"><ChevronRight className="w-4 h-4"/></button>
                <button onClick={() => onSeek(duration)} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="סוף"><SkipForward className="w-4 h-4"/></button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-zinc-800 rounded p-1">
                <button onClick={() => setZoomLevel(Math.max(0.1, zoomLevel - 0.1))} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="זום אאוט"><ZoomOut className="w-4 h-4"/></button>
                <span className="text-xs text-zinc-400 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(Math.min(50, zoomLevel + 0.1))} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="זום אין"><ZoomIn className="w-4 h-4"/></button>
                <div className="w-px h-4 bg-zinc-700 mx-1"></div>
                <button onClick={() => {
                  if (scrollRef.current && timelineDuration > 0) {
                    const containerWidth = scrollRef.current.clientWidth;
                    // Add 5% padding so the end is clearly visible
                    const paddedDuration = timelineDuration * 1.05;
                    const newZoom = Math.max(0.1, Math.min(50, containerWidth / (50 * paddedDuration)));
                    setZoomLevel(newZoom);
                  }
                }} className="p-1 hover:bg-zinc-700 rounded text-zinc-400" title="התאם למסך"><Maximize className="w-4 h-4"/></button>
            </div>
        </div>

        <div className="flex gap-2">
            <button onClick={() => onAddMarker(currentTime)} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 flex items-center gap-1 text-xs" title="הוסף סמן במיקום הנוכחי"><MapPin className="w-3 h-3"/> סמן</button>
            <button onClick={onAddChannel} className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 flex items-center gap-1 text-xs"><Plus className="w-3 h-3"/> ערוץ חדש</button>
            
            {selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 0.05 && selectedTrackId && (
              <>
                <div className="w-px h-6 bg-zinc-700 mx-1"></div>
                <button 
                  onClick={() => {
                    if (onDeleteRegion) onDeleteRegion(selectionStart, selectionEnd);
                    setSelectionStart(null);
                    setSelectionEnd(null);
                  }} 
                  className="p-1.5 bg-red-900/30 rounded hover:bg-red-900/50 text-red-400 flex items-center gap-1 text-xs"
                >
                  <Trash2 className="w-3 h-3"/> מחק קטע מסומן
                </button>
                <button 
                  onClick={() => {
                    if (onTrimRegion) onTrimRegion(selectionStart, selectionEnd);
                    setSelectionStart(null);
                    setSelectionEnd(null);
                  }} 
                  className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 flex items-center gap-1 text-xs"
                >
                  <Crop className="w-3 h-3"/> חתוך לקטע
                </button>
              </>
            )}

            {selectedTrackId && (
              <>
                <button 
                  onClick={() => onSplitTrack(selectedTrackId, currentTime)}
                  className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400"
                  title="פצל רצועה נבחרת"
                >
                  <Split className="w-4 h-4"/>
                </button>
                <button 
                  onClick={onAutoTrim}
                  className="p-1.5 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400"
                  title="הסר שקט אוטומטית"
                >
                  <Scissors className="w-4 h-4"/>
                </button>
              </>
            )}
        </div>
      </div>
      
      <div className="flex border border-zinc-800 rounded overflow-hidden bg-zinc-950">
        {/* Channels Header */}
        <div className="w-32 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 z-10">
            <div className="h-6 border-b border-zinc-800 bg-zinc-900/50"></div> {/* Ruler spacer */}
            {channels.map((channel, index) => (
                <div key={channel.id} className="h-20 border-b border-zinc-800/50 flex flex-col justify-center px-2 relative group">
                    {editingChannelId === channel.id ? (
                        <div className="flex items-center gap-1">
                            <input 
                                autoFocus
                                value={editChannelName}
                                onChange={e => setEditChannelName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        onUpdateChannel(channel.id, editChannelName);
                                        setEditingChannelId(null);
                                    }
                                }}
                                className="w-full bg-zinc-950 text-xs text-white p-1 rounded border border-zinc-700"
                            />
                            <button onClick={() => { onUpdateChannel(channel.id, editChannelName); setEditingChannelId(null); }} className="text-green-500"><Check className="w-3 h-3"/></button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-300 truncate" title={channel.name}>{channel.name}</span>
                            <div className="hidden group-hover:flex items-center gap-1">
                                <button onClick={() => { setEditingChannelId(channel.id); setEditChannelName(channel.name); }} className="text-zinc-500 hover:text-white"><Edit2 className="w-3 h-3"/></button>
                                <button onClick={() => onRemoveChannel(channel.id)} className="text-zinc-500 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                            </div>
                        </div>
                    )}
                    <div className="flex gap-1 mt-1">
                        <button 
                            className={`p-1 rounded hover:bg-zinc-700 transition-colors ${channel.muted ? 'text-red-400 bg-red-900/30' : 'text-zinc-500 hover:text-white'}`}
                            onClick={() => {
                                const newChannels = [...channels];
                                newChannels[index].muted = !newChannels[index].muted;
                                onReorderChannels(newChannels);
                            }}
                            title={channel.muted ? "Unmute Channel" : "Mute Channel"}
                        >
                            {channel.muted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                        </button>
                    </div>
                    <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveChannel(index, -1)} disabled={index === 0} className="text-zinc-600 hover:text-white disabled:opacity-30"><ChevronLeft className="w-3 h-3 rotate-90"/></button>
                        <button onClick={() => moveChannel(index, 1)} disabled={index === channels.length - 1} className="text-zinc-600 hover:text-white disabled:opacity-30"><ChevronRight className="w-3 h-3 rotate-90"/></button>
                    </div>
                </div>
            ))}
        </div>

        {/* Timeline Area */}
        <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div 
                ref={containerRef}
                className="relative cursor-text touch-none"
                style={{ width: `${Math.max(timelineWidth, scrollRef.current?.clientWidth || 0)}px`, height: `${channels.length * 80 + 24}px` }}
                onClick={handleTimelineClick}
                onMouseDown={handleTimelineMouseDown}
                onTouchStart={handleTimelineTouchStart}
            >
                {/* Ruler */}
                <div className="ruler-element h-6 border-b border-zinc-800 bg-zinc-900/50 sticky top-0 z-20 overflow-hidden cursor-crosshair">
                    {renderRuler()}
                </div>

                {/* Markers */}
                {markers.map(marker => (
                  <div 
                    key={marker.id}
                    className="absolute top-0 bottom-0 w-px z-30 pointer-events-none"
                    style={{ left: `${marker.time * pixelsPerSecond}px`, backgroundColor: marker.color || '#F97316' }}
                  >
                    <div 
                      className="absolute top-0 -ml-2 w-4 h-5 rounded-b-sm flex items-center justify-center cursor-pointer group pointer-events-auto"
                      style={{ backgroundColor: marker.color || '#F97316' }}
                      title="לחץ לקפיצה, לחיצה כפולה לעריכה, קליק ימני למחיקה, גרור להזזה"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDraggingMarkerId(marker.id);
                      }}
                      onClick={(e) => { e.stopPropagation(); onSeek(marker.time); }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingMarkerId(marker.id);
                        setEditMarkerLabel(marker.label);
                      }}
                      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onRemoveMarker(marker.id); }}
                    >
                      <MapPin className="w-2.5 h-2.5 text-white" />
                      {editingMarkerId === marker.id ? (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-zinc-800 p-1 rounded shadow-lg border border-zinc-700 z-50 pointer-events-auto">
                          <input
                            autoFocus
                            type="text"
                            value={editMarkerLabel}
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onChange={(e) => setEditMarkerLabel(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') {
                                onUpdateMarker(marker.id, { label: editMarkerLabel.trim() || marker.label });
                                setEditingMarkerId(null);
                              } else if (e.key === 'Escape') {
                                setEditingMarkerId(null);
                              }
                            }}
                            onBlur={() => {
                              onUpdateMarker(marker.id, { label: editMarkerLabel.trim() || marker.label });
                              setEditingMarkerId(null);
                            }}
                            className="bg-zinc-950 text-white text-[10px] px-1.5 py-0.5 rounded outline-none w-20"
                          />
                        </div>
                      ) : (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none shadow-lg border border-zinc-700">
                          {marker.label}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Playhead */}
                <div 
                  className="absolute top-6 bottom-0 w-px bg-orange-500 z-30 pointer-events-none shadow-[0_0_8px_rgba(249,115,22,0.8)]"
                  style={{ left: `${currentTime * pixelsPerSecond}px` }}
                >
                  <div className="absolute top-0 w-3 h-3 bg-orange-500 rounded-full -ml-[5.5px] -mt-1.5 shadow-[0_0_10px_rgba(249,115,22,1)] border border-orange-300"></div>
                  <div className="absolute top-0 bottom-0 w-[20px] -ml-[10px] bg-gradient-to-r from-transparent via-orange-500/10 to-transparent"></div>
                </div>

                {/* Snap Line */}
                {snapLine && (
                <div 
                    className="absolute top-6 bottom-0 w-px bg-yellow-400 z-20 pointer-events-none"
                    style={{ left: `${snapLine.x}px` }}
                ></div>
                )}

                {/* Selection Overlay */}
                {selectionStart !== null && selectionEnd !== null && Math.abs(selectionEnd - selectionStart) > 0.01 && (
                  <div 
                    className="absolute top-6 bottom-0 bg-blue-500/20 border-x-2 border-blue-500 z-20 pointer-events-none shadow-[inset_0_0_15px_rgba(59,130,246,0.3)]"
                    style={{ 
                      left: `${Math.min(selectionStart, selectionEnd) * pixelsPerSecond}px`,
                      width: `${Math.abs(selectionEnd - selectionStart) * pixelsPerSecond}px`
                    }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-4 bg-blue-500/30 flex items-center justify-center text-[10px] text-blue-100 font-mono border-b border-blue-500/50 backdrop-blur-sm">
                      {Math.abs(selectionEnd - selectionStart).toFixed(2)}s
                    </div>
                    {/* Left Handle */}
                    <div className="absolute top-0 bottom-0 -left-[3px] w-1.5 flex items-center justify-center">
                      <div className="w-1 h-8 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                    </div>
                    {/* Right Handle */}
                    <div className="absolute top-0 bottom-0 -right-[3px] w-1.5 flex items-center justify-center">
                      <div className="w-1 h-8 bg-blue-400 rounded-full shadow-[0_0_5px_rgba(59,130,246,0.8)]"></div>
                    </div>
                  </div>
                )}

                {/* Channel Lanes */}
                {channels.map((channel, index) => (
                    <div key={channel.id} className="absolute left-0 right-0 h-20 border-b border-zinc-800/50 pointer-events-none" style={{ top: `${index * 80 + 24}px` }}></div>
                ))}

                {/* Tracks */}
                {tracks.map((track) => {
                const channelIndex = channels.findIndex(c => c.id === track.channelId);
                if (channelIndex === -1) return null;

                const leftPx = track.startTime * pixelsPerSecond;
                const widthPx = track.duration * pixelsPerSecond;
                const isSelected = selectedTrackId === track.id;
                const isDragging = draggingTrackId === track.id;
                const isStretched = track.stretchRate !== undefined && track.stretchRate !== 1;

                return (
                    <div 
                    key={track.id}
                    className={`absolute h-20 flex items-center track-element ${isSelected || isDragging ? 'z-20' : 'z-10'}`}
                    style={{ top: `${channelIndex * 80 + 24}px`, left: `${leftPx}px`, width: `${widthPx}px` }}
                    >
                    <div 
                        className={`absolute h-16 w-full rounded cursor-grab active:cursor-grabbing flex flex-col justify-between p-1 overflow-hidden transition-all duration-200 backdrop-blur-sm touch-none ${
                        isSelected 
                          ? (isStretched ? 'bg-blue-900/60 border-2 border-orange-500 shadow-[0_4px_20px_rgba(249,115,22,0.2)]' : 'bg-zinc-800/90 border-2 border-orange-500 shadow-[0_4px_20px_rgba(249,115,22,0.2)]') 
                          : (isStretched ? 'bg-blue-900/30 hover:bg-blue-800/40 border border-blue-500/50' : 'bg-zinc-800/60 hover:bg-zinc-700/80 border border-zinc-700/50')
                        } ${isDragging ? 'opacity-80 scale-[1.01] shadow-2xl ring-2 ring-orange-500/50' : ''}`}
                        style={{ minWidth: '20px' }}
                        onMouseDown={(e) => handleMouseDown(e, track)}
                        onTouchStart={(e) => handleTouchStart(e, track)}
                        onClick={(e) => { e.stopPropagation(); onSelectTrack(track.id); }}
                        title="גרור להזזה, החזק Shift וגרור לסימון קטע"
                    >
                        {isStretched && (
                          <div className="absolute top-1 right-1 bg-blue-500/80 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold backdrop-blur-md z-10 pointer-events-none">
                            {Math.round(track.stretchRate! * 100)}%
                          </div>
                        )}
                        {track.volume !== 1 && (
                          <div className={`absolute top-1 ${isStretched ? 'right-10' : 'right-1'} bg-green-500/80 text-white text-[9px] px-1.5 py-0.5 rounded-sm font-bold backdrop-blur-md z-10 pointer-events-none flex items-center gap-0.5`}>
                            <Volume2 className="w-2.5 h-2.5" />
                            {Math.round(track.volume * 100)}%
                          </div>
                        )}
                        {/* Left Resize Handle */}
                        {!track.locked && (
                            <div 
                                className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 z-20 transition-colors touch-none ${resizingTrackId === track.id && resizeHandle === 'left' ? 'bg-orange-500' : ''}`}
                                onMouseDown={(e) => handleResizeStart(e, track, 'left')}
                                onTouchStart={(e) => handleResizeTouchStart(e, track, 'left')}
                            />
                        )}
                        {/* Right Resize Handle */}
                        {!track.locked && (
                            <div 
                                className={`absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-orange-500/50 z-20 transition-colors touch-none ${resizingTrackId === track.id && resizeHandle === 'right' ? 'bg-orange-500' : ''}`}
                                onMouseDown={(e) => handleResizeStart(e, track, 'right')}
                                onTouchStart={(e) => handleResizeTouchStart(e, track, 'right')}
                            />
                        )}

                        <div className="flex justify-between items-center z-10 relative">
                            <span className="text-[10px] font-bold text-white truncate drop-shadow-md">
                                {track.name}
                            </span>
                            <div className="flex gap-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onToggleLock(track.id); }}
                                    className="bg-zinc-900/50 hover:bg-zinc-700 text-white p-1 rounded shadow-sm transition-colors"
                                    title={track.locked ? "פתח נעילה" : "נעל רצועה"}
                                >
                                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                </button>
                                {isSelected && (
                                <>
                                <button 
                                    onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onDuplicateTrack(track.id); 
                                    }}
                                    className="bg-zinc-900/50 hover:bg-zinc-700 text-white p-1 rounded shadow-sm transition-colors"
                                    title="שכפל רצועה"
                                >
                                    <Copy className="w-3 h-3" />
                                </button>
                                <button 
                                    onClick={(e) => { 
                                    e.stopPropagation(); 
                                    onDeleteTrack(track.id); 
                                    }}
                                    className="bg-zinc-900/50 hover:bg-red-500 text-white p-1 rounded shadow-sm transition-colors"
                                    title="מחק רצועה"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                                </>
                                )}
                            </div>
                        </div>
                        <div className="absolute inset-0 pt-6 pb-1 px-1 pointer-events-none overflow-hidden">
                            <div style={{
                                width: `${track.buffer.duration * pixelsPerSecond}px`,
                                transform: `translateX(-${track.sourceStart * pixelsPerSecond}px)`,
                                height: '100%'
                            }}>
                                <TrackWaveform 
                                audioBuffer={track.buffer} 
                                color={isSelected ? '#ffffff' : '#a1a1aa'}
                                volume={track.volume}
                                />
                            </div>
                        </div>
                    </div>
                    </div>
                );
                })}
            </div>
        </div>
      </div>
    </div>
  );
};
