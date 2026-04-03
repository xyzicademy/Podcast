import { useState, useRef, useEffect, useCallback } from 'react';
// @ts-ignore
import lamejs from 'lamejs';
// @ts-ignore
import MPEGMode from 'lamejs/src/js/MPEGMode.js';
// @ts-ignore
import Lame from 'lamejs/src/js/Lame.js';
// @ts-ignore
import BitStream from 'lamejs/src/js/BitStream.js';
// @ts-ignore
import GainAnalysis from 'lamejs/src/js/GainAnalysis.js';
// @ts-ignore
import { SoundTouch, SimpleFilter } from 'soundtouchjs';

// Fix for lamejs bug where internal modules are not properly required and rely on globals
if (typeof window !== 'undefined') {
  (window as any).MPEGMode = MPEGMode;
  (window as any).Lame = Lame;
  (window as any).BitStream = BitStream;
  (window as any).GainAnalysis = GainAnalysis;
}

export interface Channel {
  id: string;
  name: string;
  muted?: boolean;
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color?: string;
}

export interface Track {
  id: string;
  name: string;
  buffer: AudioBuffer;
  volume: number;
  muted: boolean;
  solo: boolean;
  pan: number;
  startTime: number;
  channelId: string;
  locked: boolean;
  sourceStart: number;
  duration: number;
  stretchRate?: number;
  originalBuffer?: AudioBuffer;
  originalDuration?: number;
  originalSourceStart?: number;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isProcessing: boolean;
  isReady: boolean;
  playbackRate: number;
  isBypassed: boolean;
}

export interface AudioSettings {
  noiseReduction: number;
  warmth: number;
  clarity: number;
  compression: number;
  volume: number;
  compLow: number;
  compMid: number;
  compHigh: number;
  reverb: number;
  normalize: boolean;
  isHebrew?: boolean;
  deEsserFreq?: number;
  deEsserThreshold?: number;
}

export const calcEffects = (settings: AudioSettings) => {
  const deEsserFreq = settings.deEsserFreq ?? (settings.isHebrew ? 6000 : 5000);
  const deEsserThreshold = settings.deEsserThreshold ?? -20;
  
  return {
    hpFreq: 20 + (settings.noiseReduction / 100) * 280, // 0 -> 20Hz (no effect), 100 -> 300Hz
    lowGain: ((settings.warmth - 50) / 50) * 15, // 50 -> 0dB, 0 -> -15dB, 100 -> +15dB
    highGain: ((settings.clarity - 50) / 50) * 15, // 50 -> 0dB, 0 -> -15dB, 100 -> +15dB
    compThreshold: -10 - (settings.compression / 100) * 40, // 0 -> -10dB, 100 -> -50dB
    compRatio: 1 + (settings.compression / 100) * 19, // 0 -> 1:1 (no effect), 100 -> 20:1
    compLowThreshold: -10 - (settings.compLow / 100) * 40,
    compLowRatio: 1 + (settings.compLow / 100) * 19,
    compMidThreshold: -10 - (settings.compMid / 100) * 40,
    compMidRatio: 1 + (settings.compMid / 100) * 19,
    compHighThreshold: deEsserThreshold, // Use De-Esser threshold for high band
    compHighRatio: 1 + (settings.compHigh / 100) * 19, // Keep ratio based on compHigh or could be fixed
    reverbWet: settings.reverb / 100,
    reverbDry: 1 - ((settings.reverb / 100) * 0.5),
    masterGain: settings.volume / 100,
    // Frequencies
    lowShelfFreq: settings.isHebrew ? 500 : 200, // Hebrew: target 300-700Hz for guttural sounds
    highShelfFreq: settings.isHebrew ? 3000 : 4000, // Hebrew: target presence range 2kHz-4kHz
    splitLowFreq: settings.isHebrew ? 500 : 250,
    splitHighFreq: deEsserFreq, // Use De-Esser freq for high band split
    deEsserFreq,
    deEsserThreshold,
  };
};

export type PresetName = string;

export interface Preset {
  id: PresetName;
  name: string;
  description: string;
  settings: AudioSettings;
}

export const presets: Preset[] = [
  {
    id: 'original',
    name: 'הקלטה מקורית',
    description: 'ללא עיבוד, הקלטה גולמית.',
    settings: {
      noiseReduction: 0,
      warmth: 50,
      clarity: 50,
      compression: 0,
      volume: 100,
      compLow: 0,
      compMid: 0,
      compHigh: 0,
      reverb: 0,
      normalize: false
    }
  },
  {
    id: 'hebrew',
    name: 'אופטימיזציה לעברית (Pro)',
    description: 'עיבוד מקצועי לעברית: ניקוי תדרים גרוניים, דחיסה דינמית לדיבור ברור וטיפול ב-Sibilants.',
    settings: {
      noiseReduction: 65,
      warmth: 35,
      clarity: 85,
      compression: 75,
      volume: 95,
      compLow: 50,
      compMid: 65,
      compHigh: 90,
      reverb: 3,
      normalize: true,
      isHebrew: true,
      deEsserFreq: 6500,
      deEsserThreshold: -25
    }
  },
  {
    id: 'natural',
    name: 'סטודיו טבעי (Pro)',
    description: 'סאונד סטודיו מאוזן, שקוף וטבעי.',
    settings: {
      noiseReduction: 50,
      warmth: 55,
      clarity: 70,
      compression: 65,
      volume: 95,
      compLow: 45,
      compMid: 55,
      compHigh: 45,
      reverb: 5,
      normalize: true,
      deEsserFreq: 5500,
      deEsserThreshold: -22
    }
  },
  {
    id: 'radio',
    name: 'פודקאסט / רדיו (Pro)',
    description: 'סאונד עמוק, דחוס ונוכח ("Voice of God").',
    settings: {
      noiseReduction: 75,
      warmth: 85,
      clarity: 80,
      compression: 95,
      volume: 98,
      compLow: 85,
      compMid: 70,
      compHigh: 60,
      reverb: 8,
      normalize: true,
      deEsserFreq: 5000,
      deEsserThreshold: -28
    }
  },
  {
    id: 'crisp',
    name: 'חד וברור (Pro)',
    description: 'דגש על מובנות הדיבור, הפחתת רעשים אגרסיבית ובהירות גבוהה.',
    settings: {
      noiseReduction: 90,
      warmth: 25,
      clarity: 95,
      compression: 80,
      volume: 95,
      compLow: 25,
      compMid: 60,
      compHigh: 85,
      reverb: 0,
      normalize: true,
      deEsserFreq: 6000,
      deEsserThreshold: -20
    }
  },
  {
    id: 'podcast_solo',
    name: 'פודקאסט סולו (Pro)',
    description: 'סאונד עשיר ומאוזן לדובר יחיד.',
    settings: {
      noiseReduction: 60,
      warmth: 65,
      clarity: 75,
      compression: 75,
      volume: 97,
      compLow: 55,
      compMid: 65,
      compHigh: 60,
      reverb: 12,
      normalize: true,
      deEsserFreq: 5500,
      deEsserThreshold: -24
    }
  },
  {
    id: 'interview',
    name: 'ראיון (Pro)',
    description: 'הדגשת קולות הדוברים ואיזון דינמי לשיחה.',
    settings: {
      noiseReduction: 80,
      warmth: 45,
      clarity: 85,
      compression: 85,
      volume: 97,
      compLow: 45,
      compMid: 80,
      compHigh: 70,
      reverb: 4,
      normalize: true,
      deEsserFreq: 5800,
      deEsserThreshold: -22
    }
  }
];

export const defaultSettings: AudioSettings = presets[1].settings;

export function useAudioProcessor() {
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isProcessing: false,
    isReady: false,
    playbackRate: 1,
    isBypassed: false,
  });

  const [tracks, setTracks] = useState<Track[]>([]);
  const [channels, setChannels] = useState<Channel[]>([{ id: 'channel-0', name: 'ערוץ 1' }]);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [history, setHistory] = useState<Track[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [customPresets, setCustomPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem('customPresets');
    return saved ? JSON.parse(saved) : [];
  });

  const allPresets = [...presets, ...customPresets];

  const saveCustomPreset = (name: string, description: string) => {
    const newPreset: Preset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      settings: { ...settings }
    };
    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
    setCurrentPreset(newPreset.id);
  };

  const updateCustomPreset = (id: string, name: string, description: string) => {
    const updated = customPresets.map(p => p.id === id ? { ...p, name, description, settings: { ...settings } } : p);
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
  };

  const deleteCustomPreset = (id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    localStorage.setItem('customPresets', JSON.stringify(updated));
    if (currentPreset === id) {
      setCurrentPreset('original');
      setSettings(presets[0].settings);
    }
  };

  const saveState = (newTracks: Track[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newTracks);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setTracks(newTracks);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setTracks(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setTracks(history[newIndex]);
    }
  };
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<AudioSettings>(defaultSettings);
  const [currentPreset, setCurrentPreset] = useState<PresetName>('natural');

  // Sync duration with tracks
  useEffect(() => {
    if (tracks.length === 0) {
      setAudioState(s => ({ ...s, duration: 0, currentTime: 0 }));
    } else {
      const maxDuration = Math.max(...tracks.map(t => t.startTime + t.duration));
      setAudioState(s => ({ ...s, duration: maxDuration }));
    }
  }, [tracks]);

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const highPassFilterRef = useRef<BiquadFilterNode | null>(null);
  const lowShelfFilterRef = useRef<BiquadFilterNode | null>(null);
  const highShelfFilterRef = useRef<BiquadFilterNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const splitLowRef = useRef<BiquadFilterNode | null>(null);
  const splitMidLowRef = useRef<BiquadFilterNode | null>(null);
  const splitMidHighRef = useRef<BiquadFilterNode | null>(null);
  const splitHighRef = useRef<BiquadFilterNode | null>(null);
  const compLowRef = useRef<DynamicsCompressorNode | null>(null);
  const compMidRef = useRef<DynamicsCompressorNode | null>(null);
  const compHighRef = useRef<DynamicsCompressorNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const sumGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Initialize Audio Context
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    audioContextRef.current = ctx;

    // Create Audio Element
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preservesPitch = true; // Key for dynamic speed without distortion
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioElementRef.current = audio;

    // Create Master Processing Nodes
    highPassFilterRef.current = ctx.createBiquadFilter();
    lowShelfFilterRef.current = ctx.createBiquadFilter();
    highShelfFilterRef.current = ctx.createBiquadFilter();
    compressorRef.current = ctx.createDynamicsCompressor();
    
    splitLowRef.current = ctx.createBiquadFilter();
    splitMidLowRef.current = ctx.createBiquadFilter();
    splitMidHighRef.current = ctx.createBiquadFilter();
    splitHighRef.current = ctx.createBiquadFilter();
    compLowRef.current = ctx.createDynamicsCompressor();
    compMidRef.current = ctx.createDynamicsCompressor();
    compHighRef.current = ctx.createDynamicsCompressor();
    convolverRef.current = ctx.createConvolver();
    reverbGainRef.current = ctx.createGain();
    dryGainRef.current = ctx.createGain();
    sumGainRef.current = ctx.createGain();
    
    masterGainRef.current = ctx.createGain();
    analyserRef.current = ctx.createAnalyser();

    // Initial Node Configuration
    highPassFilterRef.current.type = 'highpass';
    lowShelfFilterRef.current.type = 'lowshelf';
    lowShelfFilterRef.current.frequency.value = 200;
    highShelfFilterRef.current.type = 'highshelf';
    highShelfFilterRef.current.frequency.value = 4000;
    
    splitLowRef.current.type = 'lowpass';
    splitLowRef.current.frequency.value = 250;
    splitMidLowRef.current.type = 'highpass';
    splitMidLowRef.current.frequency.value = 250;
    splitMidHighRef.current.type = 'lowpass';
    splitMidHighRef.current.frequency.value = 4000;
    splitHighRef.current.type = 'highpass';
    splitHighRef.current.frequency.value = 4000;
    
    // Create impulse response for reverb
    const length = ctx.sampleRate * 2;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
    convolverRef.current.buffer = impulse;

    analyserRef.current.fftSize = 2048;

    // Connect Media Element -> Master Chain
    const source = ctx.createMediaElementSource(audio);
    mediaSourceNodeRef.current = source;

    source.connect(masterGainRef.current);
    
    // Permanently connect the effects chain
    highPassFilterRef.current
      .connect(compressorRef.current)
      .connect(lowShelfFilterRef.current)
      .connect(highShelfFilterRef.current);
      
    // Split bands
    highShelfFilterRef.current.connect(splitLowRef.current);
    highShelfFilterRef.current.connect(splitMidLowRef.current);
    splitMidLowRef.current.connect(splitMidHighRef.current);
    highShelfFilterRef.current.connect(splitHighRef.current);
    
    // Compressors
    splitLowRef.current.connect(compLowRef.current);
    splitMidHighRef.current.connect(compMidRef.current);
    splitHighRef.current.connect(compHighRef.current);
    
    // Sum
    compLowRef.current.connect(sumGainRef.current);
    compMidRef.current.connect(sumGainRef.current);
    compHighRef.current.connect(sumGainRef.current);
    
    // Reverb routing
    sumGainRef.current.connect(dryGainRef.current).connect(analyserRef.current);
    sumGainRef.current.connect(convolverRef.current).connect(reverbGainRef.current).connect(analyserRef.current);
    
    analyserRef.current.connect(ctx.destination);

    // Event Listeners
    audio.addEventListener('timeupdate', () => {
        setAudioState(prev => ({ ...prev, currentTime: audio.currentTime }));
    });

    audio.addEventListener('ended', () => {
        setAudioState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    });

    audio.addEventListener('play', () => {
        if (ctx.state === 'suspended') ctx.resume();
        setAudioState(prev => ({ ...prev, isPlaying: true }));
    });

    audio.addEventListener('pause', () => {
        setAudioState(prev => ({ ...prev, isPlaying: false }));
    });

    return () => {
      ctx.close();
      audio.pause();
      audio.src = '';
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Handle Bypass
  useEffect(() => {
    if (!audioContextRef.current || !masterGainRef.current || !highPassFilterRef.current || !analyserRef.current) return;
    
    // Disconnect master gain from everything
    masterGainRef.current.disconnect();
    
    if (audioState.isBypassed) {
        // Bypass effects: Master Gain -> Analyser -> Destination
        masterGainRef.current.connect(analyserRef.current);
    } else {
        // Apply effects: Master Gain -> Filters -> Compressor -> Analyser -> Destination
        masterGainRef.current.connect(highPassFilterRef.current);
    }
  }, [audioState.isBypassed]);

  // Mix tracks to preview
  useEffect(() => {
    if (tracks.length === 0) {
        if (audioElementRef.current) {
            audioElementRef.current.pause();
            audioElementRef.current.src = '';
            audioElementRef.current.currentTime = 0;
            setAudioState(s => ({ ...s, isPlaying: false }));
        }
        return;
    }
    
    // Simple debounce to avoid mixing too often
    const timeoutId = setTimeout(async () => {
        try {
            const blob = await exportAudio('wav', { applyEffects: false, applyTimeStretch: false }); // Reuse export logic for preview
            const url = URL.createObjectURL(blob);
            
            if (audioElementRef.current) {
                const wasPlaying = !audioElementRef.current.paused;
                const currentTime = audioElementRef.current.currentTime;
                
                audioElementRef.current.src = url;
                audioElementRef.current.load();
                audioElementRef.current.currentTime = currentTime;
                audioElementRef.current.playbackRate = audioState.playbackRate;
                
                if (wasPlaying) {
                    audioElementRef.current.play().catch(e => console.error("Play failed", e));
                }
            }
        } catch (e) {
            console.error("Preview mix failed", e);
        }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [tracks, channels]); // Re-mix when tracks or channels change

  // Update nodes when settings change
  useEffect(() => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const fx = calcEffects(settings);

    if (highPassFilterRef.current) {
      highPassFilterRef.current.frequency.setTargetAtTime(fx.hpFreq, now, 0.1);
    }
    if (lowShelfFilterRef.current) {
      lowShelfFilterRef.current.frequency.setTargetAtTime(fx.lowShelfFreq, now, 0.1);
      lowShelfFilterRef.current.gain.setTargetAtTime(fx.lowGain, now, 0.1);
    }
    if (highShelfFilterRef.current) {
      highShelfFilterRef.current.frequency.setTargetAtTime(fx.highShelfFreq, now, 0.1);
      highShelfFilterRef.current.gain.setTargetAtTime(fx.highGain, now, 0.1);
    }
    if (compressorRef.current) {
      compressorRef.current.threshold.setTargetAtTime(fx.compThreshold, now, 0.1);
      compressorRef.current.ratio.setTargetAtTime(fx.compRatio, now, 0.1);
    }
    
    if (splitLowRef.current) {
      splitLowRef.current.frequency.setTargetAtTime(fx.splitLowFreq, now, 0.1);
    }
    if (splitMidLowRef.current) {
      splitMidLowRef.current.frequency.setTargetAtTime(fx.splitLowFreq, now, 0.1);
    }
    if (splitMidHighRef.current) {
      splitMidHighRef.current.frequency.setTargetAtTime(fx.splitHighFreq, now, 0.1);
    }
    if (splitHighRef.current) {
      splitHighRef.current.frequency.setTargetAtTime(fx.splitHighFreq, now, 0.1);
    }

    if (compLowRef.current) {
        compLowRef.current.threshold.setTargetAtTime(fx.compLowThreshold, now, 0.1);
        compLowRef.current.ratio.setTargetAtTime(fx.compLowRatio, now, 0.1);
    }
    if (compMidRef.current) {
        compMidRef.current.threshold.setTargetAtTime(fx.compMidThreshold, now, 0.1);
        compMidRef.current.ratio.setTargetAtTime(fx.compMidRatio, now, 0.1);
    }
    if (compHighRef.current) {
        compHighRef.current.threshold.setTargetAtTime(fx.compHighThreshold, now, 0.1);
        compHighRef.current.ratio.setTargetAtTime(fx.compHighRatio, now, 0.1);
    }

    if (reverbGainRef.current && dryGainRef.current) {
        reverbGainRef.current.gain.setTargetAtTime(fx.reverbWet, now, 0.1);
        dryGainRef.current.gain.setTargetAtTime(fx.reverbDry, now, 0.1);
    }

    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(fx.masterGain, now, 0.1);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AudioSettings> | ((prev: AudioSettings) => AudioSettings)) => {
    setSettings(prev => {
      const updated = typeof newSettings === 'function' ? newSettings(prev) : { ...prev, ...newSettings };
      
      setCurrentPreset(current => {
        if (current.startsWith('custom-')) {
          setCustomPresets(prevCustom => {
            const newCustom = prevCustom.map(p => 
              p.id === current ? { ...p, settings: updated } : p
            );
            localStorage.setItem('customPresets', JSON.stringify(newCustom));
            return newCustom;
          });
          return current;
        }
        
        const match = allPresets.find(p => JSON.stringify(p.settings) === JSON.stringify(updated));
        return match ? match.id : 'custom';
      });
      
      return updated;
    });
  };

  const applyPreset = (presetId: PresetName) => {
    const preset = allPresets.find(p => p.id === presetId);
    if (preset) {
      setSettings(preset.settings);
      setCurrentPreset(presetId);
    }
  };

  const loadTrack = async (file: File) => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    setAudioState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      const newTrack: Track = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        buffer: decodedBuffer,
        volume: 1,
        muted: false,
        solo: false,
        pan: 0,
        startTime: 0,
        channelId: channels.length > 0 ? channels[0].id : 'channel-0',
        locked: false,
        sourceStart: 0,
        duration: decodedBuffer.duration
      };

      setTracks([newTrack]);
      saveState([newTrack]);
      setSelectedTrackIds([newTrack.id]);
      
      // Update duration
      setAudioState(s => ({ ...s, duration: newTrack.buffer.duration, isReady: true, currentTime: 0 }));
      if (audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
      }
      
      setAudioState(prev => ({ ...prev, isProcessing: false }));
      
    } catch (error) {
      console.error("Error loading audio:", error);
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const addTrack = async (file: File, createNewChannel: boolean = false) => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    setAudioState(prev => ({ ...prev, isProcessing: true }));
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const decodedBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      let targetChannelId = channels.length > 0 ? channels[0].id : 'channel-0';
      
      if (createNewChannel) {
        targetChannelId = `channel-${Math.random().toString(36).substr(2, 9)}`;
        setChannels(prev => [...prev, { id: targetChannelId, name: `ערוץ ${prev.length + 1}` }]);
      }

      const newTrack: Track = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        buffer: decodedBuffer,
        volume: 1,
        muted: false,
        solo: false,
        pan: 0,
        startTime: 0,
        channelId: targetChannelId,
        locked: false,
        sourceStart: 0,
        duration: decodedBuffer.duration
      };

      const newTracks = [...tracks, newTrack];
      // Update duration
      const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.buffer.duration));
      setAudioState(s => ({ ...s, duration: maxDuration, isReady: true }));
      saveState(newTracks);
      
      setSelectedTrackIds([newTrack.id]);
      setAudioState(prev => ({ ...prev, isProcessing: false }));
      
    } catch (error) {
      console.error("Error loading audio:", error);
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const stop = useCallback(() => {
    if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.currentTime = 0;
    }
    setAudioState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  }, []);

  const pause = useCallback(() => {
    if (audioElementRef.current) {
        audioElementRef.current.pause();
    }
  }, []);

  const play = useCallback(() => {
    if (audioElementRef.current) {
        audioElementRef.current.play().catch(e => console.error("Play failed", e));
    }
  }, []);

  // Update track nodes when tracks change
  // Removed: No longer needed as we re-mix on track changes

  const seek = (time: number) => {
    if (audioElementRef.current) {
        audioElementRef.current.currentTime = time;
    }
  };

  const setPlaybackRate = (rate: number) => {
    setAudioState(prev => ({ ...prev, playbackRate: rate }));
    if (audioElementRef.current) {
        audioElementRef.current.playbackRate = rate;
    }
  };

  const updateOriginalBounds = (track: Track, newSourceStart: number, newDuration: number): Track => {
    if (track.originalBuffer && track.stretchRate) {
      return {
        ...track,
        sourceStart: newSourceStart,
        duration: newDuration,
        originalSourceStart: track.originalSourceStart! + (newSourceStart - track.sourceStart) * track.stretchRate,
        originalDuration: newDuration * track.stretchRate
      };
    }
    return {
      ...track,
      sourceStart: newSourceStart,
      duration: newDuration
    };
  };

  const cut = (start: number, end: number) => {
    if (selectedTrackIds.length === 0 || !audioContextRef.current) return;
    
    let newTracks = [...tracks];
    
    selectedTrackIds.forEach(id => {
      const trackIndex = newTracks.findIndex(t => t.id === id);
      if (trackIndex === -1 || newTracks[trackIndex].locked) return;
      
      const track = newTracks[trackIndex];
      const buffer = track.buffer;
      const rate = buffer.sampleRate;
      const startFrame = Math.floor(start * rate);
      const endFrame = Math.floor(end * rate);
      const totalFrames = buffer.length;
      const newLength = totalFrames - (endFrame - startFrame);
      
      if (newLength <= 0) return;

      const newBuffer = audioContextRef.current!.createBuffer(
        buffer.numberOfChannels,
        newLength,
        rate
      );

      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        const newChannelData = newBuffer.getChannelData(i);
        newChannelData.set(channelData.subarray(0, startFrame), 0);
        newChannelData.set(channelData.subarray(endFrame), startFrame);
      }

      newTracks[trackIndex] = { 
        ...track, 
        buffer: newBuffer,
        sourceStart: 0,
        duration: newLength / rate,
        originalBuffer: undefined,
        originalSourceStart: undefined,
        originalDuration: undefined,
        stretchRate: undefined
      };
    });
    
    saveState(newTracks);
    
    // Update duration
    const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
    setAudioState(prev => ({ ...prev, duration: maxDuration, currentTime: 0 }));
    if (audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
    }
  };

  const trim = (start: number, end: number) => {
    if (selectedTrackIds.length === 0 || !audioContextRef.current) return;
    
    let newTracks = [...tracks];
    
    selectedTrackIds.forEach(id => {
      const trackIndex = newTracks.findIndex(t => t.id === id);
      if (trackIndex === -1 || newTracks[trackIndex].locked) return;
      
      const track = newTracks[trackIndex];
      const buffer = track.buffer;
      const rate = buffer.sampleRate;
      const startFrame = Math.floor(start * rate);
      const endFrame = Math.floor(end * rate);
      const newLength = endFrame - startFrame;
      
      if (newLength <= 0) return;

      const newBuffer = audioContextRef.current!.createBuffer(
        buffer.numberOfChannels,
        newLength,
        rate
      );

      for (let i = 0; i < buffer.numberOfChannels; i++) {
        const channelData = buffer.getChannelData(i);
        const newChannelData = newBuffer.getChannelData(i);
        newChannelData.set(channelData.subarray(startFrame, endFrame), 0);
      }

      newTracks[trackIndex] = { 
        ...track, 
        buffer: newBuffer,
        sourceStart: 0,
        duration: newLength / rate,
        originalBuffer: undefined,
        originalSourceStart: undefined,
        originalDuration: undefined,
        stretchRate: undefined
      };
    });
    
    saveState(newTracks);
    
    // Update duration
    const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
    setAudioState(prev => ({ ...prev, duration: maxDuration, currentTime: 0 }));
    if (audioElementRef.current) {
        audioElementRef.current.currentTime = 0;
    }
  };

  const autoTrim = () => {
    if (selectedTrackIds.length === 0 || !audioContextRef.current) return;
    
    let newTracks = [...tracks];
    
    selectedTrackIds.forEach(id => {
      const trackIndex = newTracks.findIndex(t => t.id === id);
      if (trackIndex === -1 || newTracks[trackIndex].locked) return;
      
      const track = newTracks[trackIndex];
      const buffer = track.buffer;
      const rate = buffer.sampleRate;
      
      const startFrame = Math.floor(track.sourceStart * rate);
      const endFrame = Math.floor((track.sourceStart + track.duration) * rate);
      
      let firstLoudFrame = endFrame;
      let lastLoudFrame = startFrame;
      const threshold = 0.015; // Silence threshold
      
      for (let c = 0; c < buffer.numberOfChannels; c++) {
        const data = buffer.getChannelData(c);
        
        // Find first loud frame
        for (let i = startFrame; i < endFrame; i++) {
          if (Math.abs(data[i]) > threshold) {
            if (i < firstLoudFrame) firstLoudFrame = i;
            break;
          }
        }
        
        // Find last loud frame
        for (let i = endFrame - 1; i >= startFrame; i--) {
          if (Math.abs(data[i]) > threshold) {
            if (i > lastLoudFrame) lastLoudFrame = i;
            break;
          }
        }
      }
      
      if (firstLoudFrame >= lastLoudFrame) {
        return; // Track is entirely silence
      }
      
      // Add 50ms padding to avoid cutting off attacks and tails too abruptly
      const paddingFrames = Math.floor(0.05 * rate);
      firstLoudFrame = Math.max(startFrame, firstLoudFrame - paddingFrames);
      lastLoudFrame = Math.min(endFrame, lastLoudFrame + paddingFrames);
      
      const startOffsetSeconds = (firstLoudFrame - startFrame) / rate;
      const newDuration = (lastLoudFrame - firstLoudFrame) / rate;
      
      newTracks[trackIndex] = {
        ...track,
        startTime: track.startTime + startOffsetSeconds,
        sourceStart: track.sourceStart + startOffsetSeconds,
        duration: newDuration
      };
    });
    
    saveState(newTracks);
    
    const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
    setAudioState(prev => ({ ...prev, duration: maxDuration }));
  };

  const split = (time: number) => {
    if (selectedTrackIds.length === 0 || !audioContextRef.current) return;
    
    let newTracks = [...tracks];
    let newSelectedIds: string[] = [];

    selectedTrackIds.forEach(id => {
      const trackIndex = newTracks.findIndex(t => t.id === id);
      if (trackIndex === -1 || newTracks[trackIndex].locked) return;
      
      const track = newTracks[trackIndex];
      
      // Check if split point is within track bounds
      if (time <= track.startTime || time >= track.startTime + track.duration) {
        newSelectedIds.push(track.id);
        return;
      }
      
      const relativeSplitTime = time - track.startTime;
      
      const trackA: Track = updateOriginalBounds(
          {
              ...track,
              id: Math.random().toString(36).substr(2, 9),
              name: `${track.name} (Part 1)`
          },
          track.sourceStart,
          relativeSplitTime
      );
      
      const trackB: Track = updateOriginalBounds(
          {
              ...track,
              id: Math.random().toString(36).substr(2, 9),
              name: `${track.name} (Part 2)`,
              startTime: time
          },
          track.sourceStart + relativeSplitTime,
          track.duration - relativeSplitTime
      );
      
      newTracks.splice(trackIndex, 1, trackA, trackB);
      newSelectedIds.push(trackB.id);
    });
    
    saveState(newTracks);
    setSelectedTrackIds(newSelectedIds);
  };
  
  const deleteRegion = (start: number, end: number) => {
    if (selectedTrackIds.length === 0) return;
    
    let newTracks = [...tracks];
    let newSelectedIds = [...selectedTrackIds];

    selectedTrackIds.forEach(id => {
      const trackIndex = newTracks.findIndex(t => t.id === id);
      if (trackIndex === -1 || newTracks[trackIndex].locked) return;
      
      const track = newTracks[trackIndex];
      const regionStart = Math.min(start, end);
      const regionEnd = Math.max(start, end);
      
      if (regionEnd <= track.startTime || regionStart >= track.startTime + track.duration) return;
      
      const overlapStart = Math.max(regionStart, track.startTime);
      const overlapEnd = Math.min(regionEnd, track.startTime + track.duration);
      
      const EPSILON = 0.01;
      
      if (overlapStart > track.startTime + EPSILON && overlapEnd < track.startTime + track.duration - EPSILON) {
        const trackA: Track = updateOriginalBounds(
          {
            ...track,
            id: Math.random().toString(36).substr(2, 9),
            name: `${track.name} (Part 1)`
          },
          track.sourceStart,
          overlapStart - track.startTime
        );
        const trackB: Track = updateOriginalBounds(
          {
            ...track,
            id: Math.random().toString(36).substr(2, 9),
            name: `${track.name} (Part 2)`,
            startTime: overlapStart // Snap to the end of trackA
          },
          track.sourceStart + (overlapEnd - track.startTime),
          (track.startTime + track.duration) - overlapEnd
        );
        newTracks.splice(trackIndex, 1, trackA, trackB);
        newSelectedIds = newSelectedIds.map(sId => sId === id ? trackB.id : sId);
      } else if (overlapStart <= track.startTime + EPSILON && overlapEnd < track.startTime + track.duration - EPSILON) {
        const trackB: Track = updateOriginalBounds(
          {
            ...track,
            startTime: track.startTime // Snap to original start time
          },
          track.sourceStart + (overlapEnd - track.startTime),
          (track.startTime + track.duration) - overlapEnd
        );
        newTracks.splice(trackIndex, 1, trackB);
      } else if (overlapStart > track.startTime + EPSILON && overlapEnd >= track.startTime + track.duration - EPSILON) {
        const trackA: Track = updateOriginalBounds(
          {
            ...track
          },
          track.sourceStart,
          overlapStart - track.startTime
        );
        newTracks.splice(trackIndex, 1, trackA);
      } else {
        newTracks.splice(trackIndex, 1);
        newSelectedIds = newSelectedIds.filter(sId => sId !== id);
      }
    });
    
    setTracks(newTracks);
    saveState(newTracks);
    setSelectedTrackIds(newSelectedIds);
    
    if (newTracks.length === 0) {
        setAudioState(s => ({ ...s, duration: 0, currentTime: 0 }));
    } else {
        const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
        setAudioState(s => ({ ...s, duration: maxDuration }));
    }
  };

  const trimRegion = (start: number, end: number) => {
    if (selectedTrackIds.length === 0) return;
    
    let newTracks = [...tracks];
    let newSelectedIds = [...selectedTrackIds];

    selectedTrackIds.forEach(id => {
      const trackIndex = newTracks.findIndex(t => t.id === id);
      if (trackIndex === -1 || newTracks[trackIndex].locked) return;
      
      const track = newTracks[trackIndex];
      const regionStart = Math.min(start, end);
      const regionEnd = Math.max(start, end);
      
      if (regionEnd <= track.startTime || regionStart >= track.startTime + track.duration) {
        newTracks.splice(trackIndex, 1);
        newSelectedIds = newSelectedIds.filter(sId => sId !== id);
      } else {
        const overlapStart = Math.max(regionStart, track.startTime);
        const overlapEnd = Math.min(regionEnd, track.startTime + track.duration);
        
        const trimmedTrack: Track = updateOriginalBounds(
          {
            ...track,
            startTime: overlapStart
          },
          track.sourceStart + (overlapStart - track.startTime),
          overlapEnd - overlapStart
        );
        newTracks.splice(trackIndex, 1, trimmedTrack);
      }
    });
    
    setTracks(newTracks);
    saveState(newTracks);
    setSelectedTrackIds(newSelectedIds);
    
    if (newTracks.length === 0) {
        setAudioState(s => ({ ...s, duration: 0, currentTime: 0 }));
    } else {
        const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
        setAudioState(s => ({ ...s, duration: maxDuration }));
    }
  };

  const duplicateTrack = (id: string) => {
    const track = tracks.find(t => t.id === id);
    if (!track) return;

    const newTrack: Track = {
      ...track,
      id: Math.random().toString(36).substr(2, 9),
      name: `${track.name} (Copy)`,
      startTime: track.startTime + track.duration,
      locked: false
    };

    const newTracks = [...tracks, newTrack];
    saveState(newTracks);
    setSelectedTrackIds([newTrack.id]);
    
    const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
    setAudioState(s => ({ ...s, duration: maxDuration }));
  };

  const deleteTrack = (id: string) => {
      const track = tracks.find(t => t.id === id);
      if (!track || track.locked) return;

      const newTracks = tracks.filter(t => t.id !== id);
      
      if (newTracks.length === 0) {
          setAudioState(s => ({ ...s, duration: 0, currentTime: 0 }));
      } else {
          const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
          setAudioState(s => ({ ...s, duration: maxDuration }));
      }
      
      saveState(newTracks);
      
      if (selectedTrackIds.includes(id)) {
          setSelectedTrackIds(selectedTrackIds.filter(selectedId => selectedId !== id));
      }
  };

  const toggleLock = (id: string) => {
    setTracks(prev => prev.map(t => t.id === id ? { ...t, locked: !t.locked } : t));
  };

  // Load settings from local storage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('podcast-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  }, []);

  const addMarker = (time: number, label: string = 'סמן חדש') => {
    const newMarker: Marker = {
      id: `marker-${Math.random().toString(36).substr(2, 9)}`,
      time,
      label,
      color: '#F97316' // Default orange
    };
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
  };

  const removeMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const updateMarker = (id: string, updates: Partial<Marker>) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m).sort((a, b) => a.time - b.time));
  };

  // Save settings to local storage
  useEffect(() => {
    localStorage.setItem('podcast-settings', JSON.stringify(settings));
  }, [settings]);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const base64ToAudioBuffer = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
    const res = await fetch(base64);
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  };

  const saveProject = async () => {
    setAudioState(prev => ({ ...prev, isProcessing: true }));
    try {
      const serializedTracks = await Promise.all(tracks.map(async t => {
        const wavBlob = bufferToWave(t.buffer, t.buffer.length);
        const base64 = await blobToBase64(wavBlob);
        return {
          id: t.id,
          name: t.name,
          volume: t.volume,
          muted: t.muted,
          solo: t.solo,
          pan: t.pan,
          startTime: t.startTime,
          channelId: t.channelId,
          locked: t.locked,
          sourceStart: t.sourceStart,
          duration: t.duration,
          audioData: base64
        };
      }));

      const projectData = {
        settings,
        playbackRate: audioState.playbackRate,
        markers,
        channels,
        tracks: serializedTracks,
        timestamp: Date.now(),
        version: 2
      };
      
      const blob = new Blob([JSON.stringify(projectData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `podcast-project-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to save project", e);
      console.error("Failed to save project", e);
    } finally {
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const loadProject = async (file: File) => {
    setAudioState(prev => ({ ...prev, isProcessing: true }));
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.settings) {
        setSettings(data.settings);
        // Find matching preset
        const match = presets.find(p => JSON.stringify(p.settings) === JSON.stringify(data.settings));
        setCurrentPreset(match ? match.id : 'custom');
      }
      
      if (data.playbackRate) {
        setPlaybackRate(data.playbackRate);
      }
      
      if (data.markers && Array.isArray(data.markers)) {
        setMarkers(data.markers);
      }

      if (data.channels && Array.isArray(data.channels)) {
        setChannels(data.channels);
      }

      if (data.tracks && Array.isArray(data.tracks)) {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        
        const loadedTracks: Track[] = await Promise.all(data.tracks.map(async (t: any) => {
          const buffer = await base64ToAudioBuffer(t.audioData, ctx);
          return {
            id: t.id,
            name: t.name,
            volume: t.volume,
            muted: t.muted,
            solo: t.solo,
            pan: t.pan,
            startTime: t.startTime,
            channelId: t.channelId,
            locked: t.locked,
            sourceStart: t.sourceStart,
            duration: t.duration,
            buffer: buffer
          };
        }));
        
        setTracks(loadedTracks);
        if (loadedTracks.length > 0) {
          const maxDuration = Math.max(...loadedTracks.map(t => t.startTime + t.duration));
          setAudioState(prev => ({ ...prev, duration: maxDuration, isReady: true }));
        }
      }
      
    } catch (e) {
      console.error("Failed to load project", e);
      console.error("Failed to load project file", e);
    } finally {
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const updateTrack = (id: string, updates: Partial<Track>) => {
    setTracks(prev => {
      const newTracks = prev.map(t => {
        if (t.id === id) {
          return { ...t, ...updates };
        }
        return t;
      });
      
      // Update duration if startTime changed
      if (updates.startTime !== undefined || updates.duration !== undefined) {
        const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
        setAudioState(s => ({ ...s, duration: maxDuration }));
      }
      
      return newTracks;
    });
  };

  const onTrackDragEnd = () => {
    setTracks(prev => {
      setHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, historyIndex + 1);
        newHistory.push(prev);
        return newHistory;
      });
      setHistoryIndex(prevIndex => prevIndex + 1);
      return prev;
    });
  };

  const exportAudio = async (format: 'wav' | 'webm' | 'mp3' = 'wav', options: { applyEffects?: boolean, applyTimeStretch?: boolean, onProgress?: (p: number) => void } = { applyEffects: true, applyTimeStretch: true }): Promise<Blob> => {
    if (!audioContextRef.current || tracks.length === 0) throw new Error("No audio loaded");

    const playbackRate = audioState.playbackRate;
    const duration = Math.max(...tracks.map(t => t.startTime + t.duration));
    const sampleRate = audioContextRef.current.sampleRate;
    
    // 1. Render effects at 1.0x speed (original pitch/speed)
    const offlineCtx = new OfflineAudioContext(
      2, // Stereo
      Math.ceil(duration * sampleRate),
      sampleRate
    );

    // Add progress simulation for offline rendering
    const step = Math.max(1, Math.floor(duration / 10));
    for (let i = step; i < duration; i += step) {
      offlineCtx.suspend(i).then(() => {
        if (options.onProgress) {
          // If time stretching is needed, rendering is 50% of the work. Otherwise 90% (leaving 10% for encoding).
          const maxProgress = options.applyTimeStretch && Math.abs(playbackRate - 1.0) > 0.01 ? 0.5 : 0.9;
          options.onProgress((i / duration) * maxProgress);
        }
        offlineCtx.resume();
      });
    }

    // Re-create graph for offline context
    const offlineMasterGain = offlineCtx.createGain();
    
    if (options.applyEffects) {
        const fx = calcEffects(settings);
        offlineMasterGain.gain.value = fx.masterGain;

        const highPass = offlineCtx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = fx.hpFreq;

        const lowShelf = offlineCtx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = fx.lowShelfFreq;
        lowShelf.gain.value = fx.lowGain;

        const highShelf = offlineCtx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = fx.highShelfFreq;
        highShelf.gain.value = fx.highGain;

        const compressor = offlineCtx.createDynamicsCompressor();
        compressor.threshold.value = fx.compThreshold;
        compressor.knee.value = 40;
        compressor.ratio.value = fx.compRatio;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;

        // Multi-band compressor
        const splitLow = offlineCtx.createBiquadFilter();
        splitLow.type = 'lowpass';
        splitLow.frequency.value = fx.splitLowFreq;

        const splitMidLow = offlineCtx.createBiquadFilter();
        splitMidLow.type = 'highpass';
        splitMidLow.frequency.value = fx.splitLowFreq;
        const splitMidHigh = offlineCtx.createBiquadFilter();
        splitMidHigh.type = 'lowpass';
        splitMidHigh.frequency.value = fx.splitHighFreq;

        const splitHigh = offlineCtx.createBiquadFilter();
        splitHigh.type = 'highpass';
        splitHigh.frequency.value = fx.splitHighFreq;

        const compLow = offlineCtx.createDynamicsCompressor();
        compLow.threshold.value = fx.compLowThreshold;
        compLow.ratio.value = fx.compLowRatio;

        const compMid = offlineCtx.createDynamicsCompressor();
        compMid.threshold.value = fx.compMidThreshold;
        compMid.ratio.value = fx.compMidRatio;

        const compHigh = offlineCtx.createDynamicsCompressor();
        compHigh.threshold.value = fx.compHighThreshold;
        compHigh.ratio.value = fx.compHighRatio;

        // Reverb
        const convolver = offlineCtx.createConvolver();
        if (settings.reverb > 0) {
            const length = offlineCtx.sampleRate * 2; // 2 seconds
            const impulse = offlineCtx.createBuffer(2, length, offlineCtx.sampleRate);
            const left = impulse.getChannelData(0);
            const right = impulse.getChannelData(1);
            for (let i = 0; i < length; i++) {
                left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
                right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
            }
            convolver.buffer = impulse;
        }
        const reverbGain = offlineCtx.createGain();
        reverbGain.gain.value = fx.reverbWet;
        const dryGain = offlineCtx.createGain();
        dryGain.gain.value = fx.reverbDry;

        offlineMasterGain
          .connect(highPass)
          .connect(compressor)
          .connect(lowShelf)
          .connect(highShelf);

        // Split bands
        highShelf.connect(splitLow);
        highShelf.connect(splitMidLow);
        splitMidLow.connect(splitMidHigh);
        highShelf.connect(splitHigh);

        // Compressors
        splitLow.connect(compLow);
        splitMidHigh.connect(compMid);
        splitHigh.connect(compHigh);

        // Sum
        const sumGain = offlineCtx.createGain();
        compLow.connect(sumGain);
        compMid.connect(sumGain);
        compHigh.connect(sumGain);

        // Reverb routing
        sumGain.connect(dryGain).connect(offlineCtx.destination);
        if (settings.reverb > 0) {
            sumGain.connect(convolver).connect(reverbGain).connect(offlineCtx.destination);
        }
    } else {
        offlineMasterGain.gain.value = 1.0;
        offlineMasterGain.connect(offlineCtx.destination);
    }

    // Schedule all tracks at 1.0x speed
    tracks.forEach(track => {
      if (track.muted) return;
      const channel = channels.find(c => c.id === track.channelId);
      if (channel?.muted) return;
      
      const source = offlineCtx.createBufferSource();
      source.buffer = track.buffer;
      source.playbackRate.value = 1.0; // Render at normal speed first
      
      const trackGain = offlineCtx.createGain();
      trackGain.gain.value = track.volume;
      
      const panner = offlineCtx.createStereoPanner();
      panner.pan.value = track.pan;

      source.connect(trackGain).connect(panner).connect(offlineMasterGain);
      source.start(track.startTime, track.sourceStart, track.duration);
    });

    let renderedBuffer = await offlineCtx.startRendering();

    // 2. Apply Time Stretching if needed (to change speed without pitch shift)
    if (options.applyTimeStretch && Math.abs(playbackRate - 1.0) > 0.01) {
        renderedBuffer = await timeStretchBuffer(renderedBuffer, playbackRate, (p) => {
          if (options.onProgress) {
            options.onProgress(0.5 + p * 0.4); // 50% to 90%
          }
        });
    }

    if (options.onProgress) options.onProgress(0.95); // Encoding phase

    // 3. Apply Normalization if enabled
    if (options.applyEffects && settings.normalize) {
        let maxPeak = 0;
        for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
            const channelData = renderedBuffer.getChannelData(c);
            for (let i = 0; i < channelData.length; i++) {
                const absVal = Math.abs(channelData[i]);
                if (absVal > maxPeak) maxPeak = absVal;
            }
        }
        
        if (maxPeak > 0 && Math.abs(maxPeak - 0.98) > 0.01) {
            const scale = 0.98 / maxPeak; // Normalize to -0.17 dBFS
            for (let c = 0; c < renderedBuffer.numberOfChannels; c++) {
                const channelData = renderedBuffer.getChannelData(c);
                for (let i = 0; i < channelData.length; i++) {
                    channelData[i] *= scale;
                }
            }
        }
    }
    
    if (format === 'mp3') {
        const channels = renderedBuffer.numberOfChannels;
        const sampleRate = renderedBuffer.sampleRate;
        const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, 128);
        
        const samplesLeft = renderedBuffer.getChannelData(0);
        const samplesRight = channels > 1 ? renderedBuffer.getChannelData(1) : samplesLeft;
        
        // Convert Float32 to Int16
        const sampleBlockSize = 1152;
        const mp3Data = [];
        
        const leftInt16 = new Int16Array(samplesLeft.length);
        const rightInt16 = new Int16Array(samplesRight.length);
        
        for (let i = 0; i < samplesLeft.length; i++) {
            leftInt16[i] = Math.max(-1, Math.min(1, samplesLeft[i])) * 32767;
            rightInt16[i] = Math.max(-1, Math.min(1, samplesRight[i])) * 32767;
        }
        
        for (let i = 0; i < samplesLeft.length; i += sampleBlockSize) {
            const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
            const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
            
            let mp3buf;
            if (channels === 1) {
                mp3buf = mp3encoder.encodeBuffer(leftChunk);
            } else {
                mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
            }
            if (mp3buf.length > 0) mp3Data.push(mp3buf);
        }
        
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) mp3Data.push(mp3buf);
        
        return new Blob(mp3Data, { type: 'audio/mp3' });
    }
    
    return bufferToWave(renderedBuffer, renderedBuffer.length);
  };

  const toggleBypass = () => {
      setAudioState(prev => ({ ...prev, isBypassed: !prev.isBypassed }));
  };

  const matchTrackStyle = async (targetId: string, referenceId: string) => {
    const targetTrack = tracks.find(t => t.id === targetId);
    const refTrack = tracks.find(t => t.id === referenceId);
    if (!targetTrack || !refTrack) return;

    setAudioState(prev => ({ ...prev, isProcessing: true }));

    try {
      const analyzeAudio = async (buffer: AudioBuffer) => {
        let sumSquares = 0;
        let maxPeak = 0;
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < channelData.length; i++) {
          const val = channelData[i];
          sumSquares += val * val;
          if (Math.abs(val) > maxPeak) maxPeak = Math.abs(val);
        }
        const rms = Math.sqrt(sumSquares / channelData.length);
        const crestFactor = maxPeak / (rms || 0.0001);

        const getFilteredRms = async (type: 'lowpass' | 'highpass' | 'bandpass', freq: number, q: number = 1) => {
          const ctx = new OfflineAudioContext(1, buffer.length, buffer.sampleRate);
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          const filter = ctx.createBiquadFilter();
          filter.type = type;
          filter.frequency.value = freq;
          if (type === 'bandpass') filter.Q.value = q;
          src.connect(filter);
          filter.connect(ctx.destination);
          src.start(0);
          const rendered = await ctx.startRendering();
          const data = rendered.getChannelData(0);
          let sqSum = 0;
          for (let i = 0; i < data.length; i++) {
            sqSum += data[i] * data[i];
          }
          return Math.sqrt(sqSum / data.length);
        };

        const lowRms = await getFilteredRms('lowpass', 250);
        const midRms = await getFilteredRms('bandpass', 1000, 1.5);
        const highRms = await getFilteredRms('highpass', 4000);

        return { rms, crestFactor, lowRms, midRms, highRms };
      };

      const refStats = await analyzeAudio(refTrack.buffer);
      const targetStats = await analyzeAudio(targetTrack.buffer);

      const gainRatio = refStats.rms / (targetStats.rms || 0.0001);

      const refLowRatio = refStats.lowRms / refStats.rms;
      const targetLowRatio = targetStats.lowRms / targetStats.rms;
      const lowDb = 20 * Math.log10(refLowRatio / (targetLowRatio || 0.0001));

      const refMidRatio = refStats.midRms / refStats.rms;
      const targetMidRatio = targetStats.midRms / targetStats.rms;
      const midDb = 20 * Math.log10(refMidRatio / (targetMidRatio || 0.0001));

      const refHighRatio = refStats.highRms / refStats.rms;
      const targetHighRatio = targetStats.highRms / targetStats.rms;
      const highDb = 20 * Math.log10(refHighRatio / (targetHighRatio || 0.0001));

      const offlineCtx = new OfflineAudioContext(
        targetTrack.buffer.numberOfChannels,
        targetTrack.buffer.length,
        targetTrack.buffer.sampleRate
      );

      const source = offlineCtx.createBufferSource();
      source.buffer = targetTrack.buffer;

      // EQ Matching
      const lowShelf = offlineCtx.createBiquadFilter();
      lowShelf.type = 'lowshelf';
      lowShelf.frequency.value = 250;
      lowShelf.gain.value = Math.max(-15, Math.min(15, lowDb));

      const peaking = offlineCtx.createBiquadFilter();
      peaking.type = 'peaking';
      peaking.frequency.value = 1000;
      peaking.Q.value = 1.5;
      peaking.gain.value = Math.max(-15, Math.min(15, midDb));

      const highShelf = offlineCtx.createBiquadFilter();
      highShelf.type = 'highshelf';
      highShelf.frequency.value = 4000;
      highShelf.gain.value = Math.max(-15, Math.min(15, highDb));

      // Dynamics Matching (Compression)
      const compressor = offlineCtx.createDynamicsCompressor();
      if (refStats.crestFactor < targetStats.crestFactor) {
        // Reference is more compressed, apply compression
        compressor.threshold.value = -20;
        compressor.ratio.value = Math.min(10, targetStats.crestFactor / refStats.crestFactor);
        compressor.attack.value = 0.01;
        compressor.release.value = 0.1;
      } else {
        // Target is more compressed, just pass through
        compressor.threshold.value = 0;
        compressor.ratio.value = 1;
      }

      const gainNode = offlineCtx.createGain();
      gainNode.gain.value = Math.max(0.1, Math.min(5.0, gainRatio));

      source.connect(lowShelf);
      lowShelf.connect(peaking);
      peaking.connect(highShelf);
      highShelf.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(offlineCtx.destination);

      source.start(0);
      const renderedBuffer = await offlineCtx.startRendering();

      const newTracks = tracks.map(t => {
        if (t.id === targetId) {
          return { ...t, buffer: renderedBuffer };
        }
        return t;
      });

      setTracks(newTracks);
      saveState(newTracks);
    } catch (e) {
      console.error("Error matching style:", e);
    } finally {
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const stretchTrack = async (trackId: string, rate: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track || track.locked) return;

    setAudioState(prev => ({ ...prev, isProcessing: true }));
    try {
      // If reverting to 1.0 and we have the original buffer
      if (Math.abs(rate - 1.0) < 0.01 && track.originalBuffer) {
        const newTracks = tracks.map(t => {
          if (t.id === trackId) {
            return {
              ...t,
              buffer: t.originalBuffer!,
              duration: t.originalDuration!,
              sourceStart: t.originalSourceStart!,
              stretchRate: 1,
              originalBuffer: undefined,
              originalDuration: undefined,
              originalSourceStart: undefined
            };
          }
          return t;
        });
        setTracks(newTracks);
        saveState(newTracks);
        
        const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
        setAudioState(prev => ({ ...prev, duration: maxDuration }));
        return;
      }

      // We are stretching. Use original buffer if it exists, otherwise current buffer.
      const sourceBuf = track.originalBuffer || track.buffer;
      const sourceStart = track.originalSourceStart !== undefined ? track.originalSourceStart : track.sourceStart;
      const sourceDur = track.originalDuration !== undefined ? track.originalDuration : track.duration;

      // 1. Extract the exact segment
      const startSample = Math.floor(sourceStart * sourceBuf.sampleRate);
      const durationSamples = Math.floor(sourceDur * sourceBuf.sampleRate);
      const endSample = Math.min(startSample + durationSamples, sourceBuf.length);
      const actualDurationSamples = endSample - startSample;

      if (actualDurationSamples <= 0) return;

      const offlineCtx = new OfflineAudioContext(sourceBuf.numberOfChannels, actualDurationSamples, sourceBuf.sampleRate);
      const extractedBuffer = offlineCtx.createBuffer(sourceBuf.numberOfChannels, actualDurationSamples, sourceBuf.sampleRate);
      
      for (let i = 0; i < sourceBuf.numberOfChannels; i++) {
        extractedBuffer.getChannelData(i).set(sourceBuf.getChannelData(i).subarray(startSample, endSample));
      }

      // 2. Stretch the extracted segment
      const stretchedBuffer = await timeStretchBuffer(extractedBuffer, rate);
      
      const newTracks = tracks.map(t => {
        if (t.id === trackId) {
          return {
            ...t,
            buffer: stretchedBuffer,
            duration: stretchedBuffer.duration,
            sourceStart: 0,
            stretchRate: rate,
            // Save originals if not already saved
            originalBuffer: t.originalBuffer || t.buffer,
            originalDuration: t.originalDuration !== undefined ? t.originalDuration : t.duration,
            originalSourceStart: t.originalSourceStart !== undefined ? t.originalSourceStart : t.sourceStart
          };
        }
        return t;
      });
      setTracks(newTracks);
      saveState(newTracks);
      
      // Update global duration
      const maxDuration = Math.max(...newTracks.map(t => t.startTime + t.duration));
      setAudioState(prev => ({ ...prev, duration: maxDuration }));
    } catch (e) {
      console.error("Error stretching track:", e);
    } finally {
      setAudioState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const resetProject = () => {
    stop();
    setTracks([]);
    setMarkers([]);
    setChannels([{ id: 'channel-0', name: 'ערוץ 1' }]);
    setAudioState({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isReady: false,
      playbackRate: 1,
      isBypassed: false,
      isProcessing: false
    });
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedTrackIds([]);
  };

  return {
    audioState,
    settings,
    setSettings: updateSettings,
    currentPreset,
    applyPreset,
    presets: allPresets,
    saveCustomPreset,
    updateCustomPreset,
    deleteCustomPreset,
    loadTrack,
    addTrack,
    updateTrack,
    saveProject,
    loadProject,
    tracks,
    setTracks,
    channels,
    setChannels,
    markers,
    setMarkers,
    addMarker,
    removeMarker,
    updateMarker,
    selectedTrackIds,
    setSelectedTrackIds,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    play,
    pause,
    stop,
    seek,
    cut,
    trim,
    autoTrim,
    split,
    deleteRegion,
    trimRegion,
    duplicateTrack,
    deleteTrack,
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
  };
}

// Helper to time stretch AudioBuffer using soundtouchjs
async function timeStretchBuffer(buffer: AudioBuffer, rate: number, onProgress?: (p: number) => void): Promise<AudioBuffer> {
  const sampleRate = buffer.sampleRate;
  const numChannels = buffer.numberOfChannels;
  
  // Create SoundTouch instance
  const soundTouch = new SoundTouch(sampleRate);
  soundTouch.tempo = rate;
  
  // Create a filter that pipes data from source to soundTouch
  // We need to adapt the buffer to the Source interface expected by SimpleFilter
  
  const lChannel = buffer.getChannelData(0);
  const rChannel = numChannels > 1 ? buffer.getChannelData(1) : lChannel;
  const length = lChannel.length;
  
  const source = {
    extract: function(target: Float32Array, numFrames: number, position: number) {
      for (let i = 0; i < numFrames; i++) {
        const idx = position + i;
        if (idx >= length) return i; // EOF
        
        target[i * 2] = lChannel[idx];
        target[i * 2 + 1] = rChannel[idx];
      }
      return numFrames;
    }
  };
  
  const filter = new SimpleFilter(source, soundTouch);
  
  const outputL: number[] = [];
  const outputR: number[] = [];
  
  const bufferSize = 2048;
  const samples = new Float32Array(bufferSize * 2);
  
  let framesExtracted = 0;
  let totalFrames = 0;
  let loops = 0;
  while ((framesExtracted = filter.extract(samples, bufferSize)) > 0) {
    for (let i = 0; i < framesExtracted; i++) {
      outputL.push(samples[i * 2]);
      outputR.push(samples[i * 2 + 1]);
    }
    totalFrames += framesExtracted;
    loops++;
    if (onProgress && loops % 10 === 0) {
       onProgress(Math.min(1, totalFrames / (length / rate)));
       await new Promise(r => setTimeout(r, 0)); // yield to main thread
    }
  }
  
  const newLength = outputL.length;
  const newBuffer = new AudioBuffer({
    length: newLength,
    numberOfChannels: 2,
    sampleRate: sampleRate
  });
  
  newBuffer.copyToChannel(new Float32Array(outputL), 0);
  newBuffer.copyToChannel(new Float32Array(outputR), 1);
  
  return newBuffer;
}

// Helper to convert AudioBuffer to WAV Blob
function bufferToWave(abuffer: AudioBuffer, len: number) {
  let numOfChan = abuffer.numberOfChannels,
      length = len * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [], i, sample,
      offset = 0,
      pos = 0;

  // write WAVE header
  setUint32(0x46464952);                         // "RIFF"
  setUint32(length - 8);                         // file length - 8
  setUint32(0x45564157);                         // "WAVE"

  setUint32(0x20746d66);                         // "fmt " chunk
  setUint32(16);                                 // length = 16
  setUint16(1);                                  // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2);                      // block-align
  setUint16(16);                                 // 16-bit (hardcoded in this example)

  setUint32(0x61746164);                         // "data" - chunk
  setUint32(length - pos - 4);                   // chunk length

  // write interleaved data
  for(i = 0; i < abuffer.numberOfChannels; i++)
    channels.push(abuffer.getChannelData(i));

  while(pos < length) {
    for(i = 0; i < numOfChan; i++) {             // interleave channels
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true);          // write 16-bit sample
      pos += 2;
    }
    offset++                                     // next source sample
  }

  return new Blob([buffer], {type: "audio/wav"});

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }
}
