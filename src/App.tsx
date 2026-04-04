/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Download, Mic, Settings, Volume2, Activity, Plus, Layers, Music, Save, Undo, Redo, SkipBack, SkipForward, Rewind, FastForward, ChevronLeft, ChevronRight, ChevronFirst } from 'lucide-react';
import { useAudioProcessor, PresetName, Channel } from './hooks/useAudioProcessor';
import { AudioUploader } from './components/AudioUploader';
import { AudioRecorder } from './components/AudioRecorder';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MultiTrackTimeline } from './components/MultiTrackTimeline';
import { Knob } from './components/Knob';
import { Scissors, Trash2, FileAudio, Crop, Split, HelpCircle, RotateCcw, Edit2, SaveAll, Brush, SlidersHorizontal } from 'lucide-react';
import { UserGuide } from './components/UserGuide';

function App() {
  const [showGuide, setShowGuide] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showDeletePresetConfirm, setShowDeletePresetConfirm] = useState(false);
  const [presetModalMode, setPresetModalMode] = useState<'create' | 'edit'>('create');
  const [presetName, setPresetName] = useState('');
  const [presetDesc, setPresetDesc] = useState('');
  const { 
    audioState, 
    settings, 
    setSettings, 
    currentPreset,
    applyPreset,
    presets,
    saveCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
    loadTrack,
    addTrack,
    saveProject,
    loadProject,
    tracks,
    setTracks,
    channels,
    setChannels,
    markers,
    addMarker,
    removeMarker,
    updateMarker,
    updateTrack,
    selectedTrackIds,
    setSelectedTrackIds,
    undo,
    redo,
    canUndo,
    canRedo,
    play, 
    pause, 
    stop, 
    seek,
    autoTrim,
    split,
    deleteRegion,
    trimRegion,
    duplicateTracks,
    deleteTracks,
    setPlaybackRate,
    toggleBypass,
    toggleLock,
    analyserRef, 
    exportAudio,
    onTrackDragEnd,
    matchTrackStyle,
    stretchTrack,
    resetProject,
    setAudioState
  } = useAudioProcessor();

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exportFormat, setExportFormat] = useState<'wav' | 'webm' | 'mp3'>('mp3');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [localTrackSpeed, setLocalTrackSpeed] = useState<number>(1);
  const [localTrackVolume, setLocalTrackVolume] = useState<number>(1);

  const selectedTrack = tracks.find(t => selectedTrackIds.includes(t.id));

  useEffect(() => {
    if (selectedTrack && selectedTrackIds.length === 1) {
      setLocalTrackSpeed(selectedTrack.stretchRate || 1);
      setLocalTrackVolume(selectedTrack.volume ?? 1);
    } else {
      setLocalTrackSpeed(1);
      setLocalTrackVolume(1);
    }
  }, [selectedTrackIds, selectedTrack?.stretchRate, selectedTrack?.volume]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (tracks.length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tracks.length]);

  const handleFileSelect = (file: File) => {
    loadTrack(file);
    applyPreset('original');
  };

  const handleAddMedia = (file: File) => {
    addTrack(file, true);
    applyPreset('original');
  };

  const handleExport = async () => {
    if (!audioState.isReady || tracks.length === 0) return;
    
    setIsExporting(true);
    setExportProgress(0);
    try {
      const blob = await exportAudio(exportFormat, {
        applyEffects: !audioState.isBypassed,
        applyTimeStretch: audioState.playbackRate !== 1,
        onProgress: (p) => setExportProgress(p)
      });
      setExportProgress(1);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhanced-podcast.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
      console.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeek = (time: number) => {
    seek(time + (selectedTrack?.startTime || 0));
  };

  const handleSplit = () => {
      if (audioState.currentTime > 0) {
          split(audioState.currentTime);
      }
  };

  const jumpToPreviousEdge = () => {
    const edges = [0, ...tracks.flatMap(t => [t.startTime, t.startTime + t.duration])];
    const uniqueEdges = Array.from(new Set(edges)).sort((a, b) => a - b);
    const prev = uniqueEdges.reverse().find(e => e < audioState.currentTime - 0.01);
    seek(prev !== undefined ? prev : 0);
  };

  const jumpToNextEdge = () => {
    const edges = [...tracks.flatMap(t => [t.startTime, t.startTime + t.duration]), audioState.duration];
    const uniqueEdges = Array.from(new Set(edges)).sort((a, b) => a - b);
    const next = uniqueEdges.find(e => e > audioState.currentTime + 0.01);
    if (next !== undefined) seek(next);
  };

  const fineSeek = (amount: number) => {
    seek(Math.max(0, Math.min(audioState.duration, audioState.currentTime + amount)));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (e.code === 'Space') {
        e.preventDefault();
        if (audioState.isPlaying) {
          pause();
        } else {
          play();
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        addMarker(audioState.currentTime);
      } else if (e.code === 'KeyS' && !cmdOrCtrl) {
        e.preventDefault();
        handleSplit();
      } else if (e.code === 'KeyZ' && cmdOrCtrl && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.code === 'KeyZ' && cmdOrCtrl && e.shiftKey) || (e.code === 'KeyY' && cmdOrCtrl)) {
        e.preventDefault();
        redo();
      } else if (e.code === 'KeyD' && cmdOrCtrl) {
        e.preventDefault();
        duplicateTracks(selectedTrackIds);
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedTrackIds.length > 0) {
          e.preventDefault();
          deleteTracks(selectedTrackIds);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [audioState.currentTime, audioState.isPlaying, addMarker, handleSplit, play, pause, undo, redo, duplicateTracks, deleteTracks, selectedTrackIds]);

  const handleDeleteTracks = (ids: string[]) => {
      deleteTracks(ids);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500/30" dir="rtl">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight">Podcast Studio <span className="text-zinc-500 font-normal">Enhancer</span></h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <button 
              onClick={undo}
              disabled={!canUndo}
              className="flex items-center gap-2 hover:text-white transition-colors disabled:opacity-50"
              title="בטל פעולה"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button 
              onClick={redo}
              disabled={!canRedo}
              className="flex items-center gap-2 hover:text-white transition-colors disabled:opacity-50"
              title="בצע שוב"
            >
              <Redo className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-2"></div>
            <button 
              onClick={saveProject}
              className="flex items-center gap-2 hover:text-white transition-colors"
              title="שמור הגדרות פרויקט"
            >
              <Save className="w-4 h-4" />
              <span className="hidden sm:inline">שמור</span>
            </button>
            <label className="flex items-center gap-2 hover:text-white transition-colors cursor-pointer" title="טען הגדרות פרויקט">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">טען</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    loadProject(e.target.files[0]);
                    e.target.value = '';
                  }
                }} 
                className="hidden" 
              />
            </label>
            <div className="w-px h-4 bg-zinc-800 mx-2"></div>
            <button 
              onClick={() => setShowGuide(true)}
              className="flex items-center gap-2 hover:text-white transition-colors text-orange-400 hover:text-orange-300"
              title="מדריך למשתמש"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">מדריך</span>
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-2"></div>
            <button 
              onClick={() => setShowResetConfirm(true)} 
              className="flex items-center gap-2 hover:text-red-400 transition-colors text-zinc-400"
              title="איפוס פרויקט"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">איפוס</span>
            </button>
            <div className="w-px h-4 bg-zinc-800 mx-2"></div>
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              עיבוד סאונד מתקדם
            </span>
          </div>
        </div>
      </header>

      <UserGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />

      <main className="w-full px-4 py-8">
        
        {/* Main Interface */}
        {!audioState.isReady && tracks.length === 0 ? (
          <div className="max-w-4xl mx-auto space-y-8 mt-10">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl relative overflow-hidden group min-h-[500px] flex items-center justify-center">
              {/* Background Image */}
              <div 
                className="absolute inset-0 z-0 opacity-20 bg-cover bg-center bg-no-repeat transition-transform duration-10000 group-hover:scale-105"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=80&w=2000&auto=format&fit=crop")' }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-transparent z-0"></div>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.15),transparent_70%)] pointer-events-none z-0"></div>
              
              <div className="flex flex-col items-center justify-center gap-8 relative z-10 w-full p-8">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mx-auto mb-6">
                    <Mic className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">ברוכים הבאים ל-Podcast Studio</h2>
                  <p className="text-zinc-400 text-lg">התחל על ידי העלאת קובץ אודיו או הקלטה חדשה</p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 w-full max-w-3xl bg-zinc-950/60 p-8 rounded-2xl backdrop-blur-md border border-zinc-800/50 shadow-xl">
                  <div className="flex-1 w-full">
                    <AudioUploader onFileSelect={handleFileSelect} />
                  </div>
                  <div className="w-px h-32 bg-zinc-800 hidden md:block"></div>
                  <div className="h-px w-full bg-zinc-800 md:hidden"></div>
                  <div className="flex-1 w-full flex justify-center">
                    <AudioRecorder onSave={handleFileSelect} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Full Width Timeline */}
            <div className="w-full bg-zinc-900 rounded-2xl border border-zinc-800 p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.05),transparent_70%)] pointer-events-none"></div>
              
              <div className="space-y-2 relative z-10">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">ציר זמן רב-ערוצי</h4>
                    <button
                      onClick={() => {
                        const usedChannelIds = new Set(tracks.map(t => t.channelId));
                        const newChannels = channels.filter(c => usedChannelIds.has(c.id));
                        if (newChannels.length === 0) {
                          setChannels([{ id: `channel-${Math.random().toString(36).substr(2, 9)}`, name: 'ערוץ 1' }]);
                          // Reset timer if all tracks are gone
                          if (tracks.length === 0) seek(0);
                        } else {
                          setChannels(newChannels);
                        }
                      }}
                      className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors border border-zinc-700"
                    >
                      מחק ערוצים ריקים
                    </button>
                  </div>
                  <MultiTrackTimeline 
                    tracks={tracks}
                    channels={channels}
                    currentTime={audioState.currentTime}
                    duration={audioState.duration}
                    onTrackUpdate={updateTrack}
                    onTrackDragEnd={onTrackDragEnd}
                    onSeek={seek}
                    selectedTrackIds={selectedTrackIds}
                    onSelectTrack={(id, multi) => {
                      if (!id) {
                        setSelectedTrackIds([]);
                        return;
                      }
                      if (multi) {
                        setSelectedTrackIds(prev => 
                          prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
                        );
                      } else {
                        setSelectedTrackIds([id]);
                      }
                    }}
                    onDuplicateTracks={duplicateTracks}
                    onAutoTrim={autoTrim}
                    onDeleteTracks={handleDeleteTracks}
                    onTrackReorder={setTracks}
                    onSplitTrack={(time) => {
                        split(time);
                    }}
                    onAddChannel={() => {
                        const newId = `channel-${Math.random().toString(36).substr(2, 9)}`;
                        setChannels([...channels, { id: newId, name: `ערוץ ${channels.length + 1}` }]);
                    }}
                    onRemoveChannel={(channelId) => {
                        const newTracks = tracks.filter(t => t.channelId !== channelId);
                        setTracks(newTracks);
                        
                        if (newTracks.length === 0) {
                          seek(0);
                          setAudioState(s => ({ ...s, duration: 0, currentTime: 0 }));
                        } else {
                          const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
                          setAudioState(s => ({ ...s, duration: maxDuration }));
                        }
                        
                        const remainingChannels = channels.filter(c => c.id !== channelId);
                        if (remainingChannels.length === 0) {
                          setChannels([{ id: `channel-${Math.random().toString(36).substr(2, 9)}`, name: 'ערוץ 1' }]);
                        } else {
                          setChannels(remainingChannels);
                        }
                    }}
                    onUpdateChannel={(channelId, name) => {
                        setChannels(channels.map(c => c.id === channelId ? { ...c, name } : c));
                    }}
                    onReorderChannels={setChannels}
                    onToggleLock={toggleLock}
                    markers={markers}
                    onAddMarker={addMarker}
                    onRemoveMarker={removeMarker}
                    onUpdateMarker={updateMarker}
                    onDeleteRegion={deleteRegion}
                    onTrimRegion={trimRegion}
                    isPlaying={audioState.isPlaying}
                    onTogglePlayback={audioState.isPlaying ? pause : play}
                  />
              </div>
            </div>

            {/* Controls and Settings Below */}
            <div className="max-w-7xl mx-auto flex flex-col gap-4 mt-4">
              
              {/* Play Unit */}
              <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 shadow-lg">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row items-start justify-between gap-6">
                    {/* Right Side: Playback & Global Speed */}
                    <div className="flex flex-col gap-4 flex-1">
                      {/* Playback Controls */}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button 
                          onClick={() => seek(0)}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="חזור להתחלה"
                        >
                          <ChevronFirst className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={jumpToNextEdge}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="קפוץ לקצה הבא"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => fineSeek(1)}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="קדימה 1 שניה"
                        >
                          <FastForward className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => fineSeek(0.01)}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="קדימה 0.01 שניות"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>

                        <button 
                          onClick={audioState.isPlaying ? pause : play}
                          className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 flex-shrink-0 mx-2"
                        >
                          {audioState.isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                        </button>
                        
                        <button 
                          onClick={() => fineSeek(-0.01)}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="אחורה 0.01 שניות"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => fineSeek(-1)}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="אחורה 1 שניה"
                        >
                          <Rewind className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={jumpToPreviousEdge}
                          className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-all"
                          title="קפוץ לקצה הקודם"
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Global Speed */}
                      <div className="flex items-center gap-3 bg-zinc-800/50 p-2 px-4 rounded-lg border border-zinc-700/50 max-w-[400px] mx-auto w-full">
                          <span className="text-xs font-bold text-zinc-500 whitespace-nowrap">מהירות כללית:</span>
                          <input 
                              type="range" 
                              min="0.5" 
                              max="2.0" 
                              step="0.05" 
                              value={audioState.playbackRate}
                              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                              className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full"
                          />
                          <div className="flex items-center gap-1 w-16 justify-end">
                            <span className="text-xs font-mono text-zinc-300">{Math.round(audioState.playbackRate * 100)}%</span>
                            {audioState.playbackRate !== 1 && (
                              <button 
                                onClick={() => setPlaybackRate(1)}
                                className="text-orange-400 hover:text-orange-300 p-0.5 rounded-full hover:bg-orange-500/20 transition-colors"
                                title="איפוס מהירות"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                      </div>
                    </div>
                    
                    {/* Left Side: Track Controls */}
                    <div className={`flex flex-col gap-2 flex-1 min-w-[200px] max-w-[400px] ${selectedTrackIds.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                      <h4 className="text-sm font-bold text-orange-400 mb-1 text-center">
                        {selectedTrackIds.length > 1 ? `שליטה ב-${selectedTrackIds.length} רצועות נבחרות` : 'שליטה ברצועה נבחרת'}
                      </h4>
                      {/* Track Speed */}
                      <div className="flex items-center gap-3 bg-zinc-800/50 p-2 px-4 rounded-lg border border-zinc-700/50">
                          <span className="text-xs font-bold text-zinc-500 whitespace-nowrap flex items-center gap-1">
                            <FastForward className="w-3 h-3" />
                            מהירות רצועה:
                          </span>
                          <input 
                              type="range" 
                              min="0.5" 
                              max="2.0" 
                              step="0.05" 
                              value={localTrackSpeed}
                              onChange={(e) => setLocalTrackSpeed(parseFloat(e.target.value))}
                              onMouseUp={() => {
                                selectedTrackIds.forEach(id => stretchTrack(id, localTrackSpeed));
                              }}
                              onTouchEnd={() => {
                                selectedTrackIds.forEach(id => stretchTrack(id, localTrackSpeed));
                              }}
                              className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
                          />
                          <div className="flex items-center gap-1 w-16 justify-end">
                            <span className="text-xs font-mono text-zinc-300">{Math.round(localTrackSpeed * 100)}%</span>
                            {localTrackSpeed !== 1 && (
                              <button 
                                onClick={() => {
                                  setLocalTrackSpeed(1);
                                  selectedTrackIds.forEach(id => stretchTrack(id, 1));
                                }}
                                className="text-blue-400 hover:text-blue-300 p-0.5 rounded-full hover:bg-blue-500/20 transition-colors"
                                title="איפוס מהירות"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                      </div>

                      {/* Track Volume */}
                      <div className="flex items-center gap-3 bg-zinc-800/50 p-2 px-4 rounded-lg border border-zinc-700/50">
                          <span className="text-xs font-bold text-zinc-500 whitespace-nowrap flex items-center gap-1">
                            <Volume2 className="w-3 h-3" />
                            עוצמת רצועה:
                          </span>
                          <input 
                              type="range" 
                              min="0" 
                              max="5" 
                              step="0.05" 
                              value={localTrackVolume}
                              onChange={(e) => setLocalTrackVolume(parseFloat(e.target.value))}
                              onMouseUp={() => {
                                selectedTrackIds.forEach(id => updateTrack(id, { volume: localTrackVolume }));
                              }}
                              onTouchEnd={() => {
                                selectedTrackIds.forEach(id => updateTrack(id, { volume: localTrackVolume }));
                              }}
                              className="w-full h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full"
                          />
                          <div className="flex items-center gap-1 w-16 justify-end">
                            <span className="text-xs font-mono text-zinc-300">{Math.round(localTrackVolume * 100)}%</span>
                            {localTrackVolume !== 1 && (
                              <button 
                                onClick={() => {
                                  setLocalTrackVolume(1);
                                  selectedTrackIds.forEach(id => updateTrack(id, { volume: 1 }));
                                }}
                                className="text-green-400 hover:text-green-300 p-0.5 rounded-full hover:bg-green-500/20 transition-colors"
                                title="איפוס עוצמה"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset Selection Unit */}
              <div className={`bg-zinc-900 rounded-xl border border-zinc-800 p-4 shadow-lg transition-opacity duration-500 ${audioState.isReady ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    בחר סגנון
                  </h2>
                  <button
                    onClick={() => applyPreset('hebrew')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                      currentPreset === 'hebrew'
                        ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                        : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    אופטימיזציה קולית לעברית
                  </button>
                </div>

                <div className={`grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 ${audioState.isBypassed ? 'grayscale opacity-50 pointer-events-none' : ''}`}>
                  {presets.filter(p => p.id !== 'hebrew').map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={`
                        relative p-3 rounded-lg border text-right transition-all duration-200
                        ${currentPreset === preset.id 
                          ? 'bg-orange-500/10 border-orange-500 ring-1 ring-orange-500/50' 
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800'
                        }
                      `}
                    >
                      <div className={`font-bold text-sm mb-1 ${currentPreset === preset.id ? 'text-orange-500' : 'text-zinc-200'}`}>
                        {currentPreset === preset.id && preset.id.startsWith('custom-') ? (
                          <input
                            type="text"
                            value={preset.name}
                            onChange={(e) => {
                              updateCustomPreset(preset.id, e.target.value, preset.description);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-b border-orange-500/50 focus:border-orange-500 outline-none w-full text-right"
                          />
                        ) : (
                          preset.name
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 leading-tight">
                        {currentPreset === preset.id && preset.id.startsWith('custom-') ? (
                          <input
                            type="text"
                            value={preset.description}
                            onChange={(e) => {
                              updateCustomPreset(preset.id, preset.name, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-transparent border-b border-zinc-700 focus:border-zinc-500 outline-none w-full text-right mt-1"
                          />
                        ) : (
                          preset.description
                        )}
                      </div>
                      {currentPreset === preset.id && (
                        <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2 transition-colors"
                  >
                    {showAdvanced ? 'הסתר הגדרות מתקדמות' : 'הצג הגדרות מתקדמות (דיוקים)'}
                    <SlidersHorizontal className="w-3 h-3" />
                  </button>
                </div>

                {/* Advanced Knobs */}
                <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 justify-items-center mt-4 transition-all duration-500 overflow-hidden ${showAdvanced ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'} ${audioState.isBypassed ? 'grayscale opacity-50 pointer-events-none' : ''}`}>
                  <Knob label="הפחתת רעש" value={settings.noiseReduction} onChange={(v) => setSettings(s => ({...s, noiseReduction: v}))} color="#10B981" />
                  <Knob label="חמימות" value={settings.warmth} onChange={(v) => setSettings(s => ({...s, warmth: v}))} color="#F59E0B" />
                  <Knob label="צלילות" value={settings.clarity} onChange={(v) => setSettings(s => ({...s, clarity: v}))} color="#3B82F6" />
                  <Knob label="דחיסה (כללי)" value={settings.compression} onChange={(v) => setSettings(s => ({...s, compression: v}))} color="#EF4444" />
                  <Knob label="עוצמה" value={settings.volume} onChange={(v) => setSettings(s => ({...s, volume: v}))} color="#F97316" />
                  
                  <Knob label="דחיסת נמוכים" value={settings.compLow} onChange={(v) => setSettings(s => ({...s, compLow: v}))} color="#8B5CF6" />
                  <Knob label="דחיסת אמצע" value={settings.compMid} onChange={(v) => setSettings(s => ({...s, compMid: v}))} color="#EC4899" />
                  <Knob label="דחיסת גבוהים" value={settings.compHigh} onChange={(v) => setSettings(s => ({...s, compHigh: v}))} color="#06B6D4" />
                  <Knob label="הד (Reverb)" value={settings.reverb} onChange={(v) => setSettings(s => ({...s, reverb: v}))} color="#14B8A6" />
                  
                  <Knob label="תדר De-Esser" value={settings.deEsserFreq ?? (settings.isHebrew ? 6000 : 5000)} min={2000} max={10000} onChange={(v) => setSettings(s => ({...s, deEsserFreq: v}))} color="#F43F5E" />
                  <Knob label="סף De-Esser" value={settings.deEsserThreshold ?? -20} min={-60} max={0} onChange={(v) => setSettings(s => ({...s, deEsserThreshold: v}))} color="#E11D48" />

                  <div className="flex flex-col items-center justify-center space-y-2">
                    <label className="text-xs font-medium text-slate-400">נרמול (Normalize)</label>
                    <button
                      onClick={() => setSettings(s => ({...s, normalize: !s.normalize}))}
                      className={`w-16 h-8 rounded-full flex items-center transition-colors duration-300 focus:outline-none ${settings.normalize ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 ${settings.normalize ? 'translate-x-1' : 'translate-x-9'}`} />
                    </button>
                  </div>
                  
                  <div className="col-span-2 md:col-span-5 flex justify-center gap-4 mt-6 pt-4 border-t border-zinc-800 w-full">
                    <button
                      onClick={() => {
                        setPresetModalMode('create');
                        setPresetName('');
                        setPresetDesc('');
                        setShowPresetModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      <SaveAll className="w-4 h-4" />
                      שמור כסגנון חדש
                    </button>
                    
                    {currentPreset.startsWith('custom-') && (
                      <>
                        <button
                          onClick={() => {
                            setShowDeletePresetConfirm(true);
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          מחק סגנון
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Row: Add Media, Style Transfer, Export */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                
                {/* Add Media Card */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 shadow-lg flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0"><Upload className="w-4 h-4 text-blue-400" /></div>
                    הוסף מדיה
                  </h3>
                  <div className="space-y-2 flex-1">
                    <AudioRecorder onSave={handleAddMedia} />
                    <div className="h-px w-full bg-zinc-800"></div>
                    <AudioUploader onFileSelect={handleAddMedia} />
                  </div>
                </div>

                {/* Match Style Card */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 shadow-lg flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0"><Brush className="w-4 h-4 text-purple-400" /></div>
                    התאמת סגנון
                  </h3>
                  <p className="text-xs text-zinc-500 mb-2 leading-tight">
                    החל את עוצמת הסאונד, העומק והחמימות מרצועה אחרת על הרצועה הנבחרת.
                  </p>
                  <div className="space-y-2 flex-1">
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">קטע יעד (נבחר)</label>
                      <div className="bg-zinc-800 text-zinc-300 p-2 rounded border border-zinc-700 text-sm truncate">
                        {selectedTrack ? selectedTrack.name : 'לא נבחר קטע'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-1">קטע מקור (לחיקוי)</label>
                      <div className="flex flex-col gap-2">
                        <select 
                          id="reference-track-select"
                          className="bg-zinc-800 text-white p-2 rounded border border-zinc-700 focus:border-orange-500 outline-none text-sm w-full"
                          defaultValue=""
                        >
                          <option value="" disabled>בחר קטע מקור...</option>
                          {tracks.filter(t => !selectedTrackIds.includes(t.id)).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const selectEl = document.getElementById('reference-track-select') as HTMLSelectElement;
                            const refId = selectEl?.value;
                            if (refId && selectedTrackIds.length > 0) {
                              selectedTrackIds.forEach(id => matchTrackStyle(id, refId));
                              selectEl.value = ""; // Reset after applying
                            }
                          }}
                          disabled={selectedTrackIds.length === 0 || tracks.length < 2 || audioState.isProcessing}
                          className="bg-orange-500 hover:bg-orange-400 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-2 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                          <Brush className="w-4 h-4" />
                          החל סגנון
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Export Card */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 shadow-lg flex flex-col">
                  <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                    <div className="bg-zinc-800 p-1.5 rounded-lg shrink-0"><Download className="w-4 h-4 text-green-400" /></div>
                    ייצוא פרויקט
                  </h3>
                  <p className="text-xs text-zinc-500 mb-2 leading-tight">
                    שמור את האודיו המעובד.
                  </p>

                  <div className="mb-2 flex-1">
                    <label className="block text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2">פורמט ייצוא</label>
                    <div className="flex gap-2">
                      {['wav', 'mp3', 'webm'].map((fmt) => (
                        <button 
                          key={fmt}
                          onClick={() => setExportFormat(fmt as any)}
                          className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors uppercase ${exportFormat === fmt ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleExport}
                    disabled={!audioState.isReady || tracks.length === 0 || isExporting}
                    className={`
                      w-full py-2.5 rounded font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all relative overflow-hidden
                      ${(!audioState.isReady || tracks.length === 0)
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                        : 'bg-white text-zinc-900 hover:bg-zinc-200 shadow-lg shadow-white/10'
                      }
                    `}
                  >
                    {isExporting && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-green-500/30 transition-all duration-200" 
                        style={{ width: `${exportProgress * 100}%` }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {isExporting ? (
                        <>מעבד... {Math.round(exportProgress * 100)}%</>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          ייצוא לקובץ
                        </>
                      )}
                    </span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-6">
            <h3 className="text-xl font-bold text-white">איפוס פרויקט</h3>
            <p className="text-zinc-400">האם אתה בטוח שברצונך לאפס את כל הפרויקט? כל השינויים, הרצועות וההגדרות יימחקו ולא ניתן יהיה לשחזר אותם.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={() => {
                  resetProject();
                  setShowResetConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                כן, אפס פרויקט
              </button>
            </div>
          </div>
        </div>
      )}

      {showPresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-6">
            <h3 className="text-xl font-bold text-white">
              {presetModalMode === 'create' ? 'שמור סגנון חדש' : 'ערוך שם סגנון'}
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">שם הסגנון</label>
                <input 
                  type="text" 
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="לדוגמה: פודקאסט חם"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">תיאור (אופציונלי)</label>
                <input 
                  type="text" 
                  value={presetDesc}
                  onChange={(e) => setPresetDesc(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="תיאור קצר של הסגנון..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setShowPresetModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={() => {
                  if (presetName.trim()) {
                    if (presetModalMode === 'create') {
                      saveCustomPreset(presetName, presetDesc);
                    } else {
                      updateCustomPreset(currentPreset, presetName, presetDesc);
                    }
                    setShowPresetModal(false);
                  }
                }}
                disabled={!presetName.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeletePresetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-6">
            <h3 className="text-xl font-bold text-white">מחיקת סגנון</h3>
            <p className="text-zinc-400">האם אתה בטוח שברצונך למחוק סגנון זה? פעולה זו אינה ניתנת לביטול.</p>
            <div className="flex justify-end gap-3 mt-4">
              <button 
                onClick={() => setShowDeletePresetConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                ביטול
              </button>
              <button 
                onClick={() => {
                  deleteCustomPreset(currentPreset);
                  setShowDeletePresetConfirm(false);
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                כן, מחק סגנון
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default App;


