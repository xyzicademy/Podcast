import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Save } from 'lucide-react';

interface AudioRecorderProps {
  onSave: (file: File) => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSave }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [micGain, setMicGain] = useState(1);
  const [studioMode, setStudioMode] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = micGain;
    }
  }, [micGain]);

  const drawVuMeter = () => {
    if (!analyserRef.current || !canvasRef.current) {
        animationFrameRef.current = requestAnimationFrame(drawVuMeter);
        return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        animationFrameRef.current = requestAnimationFrame(drawVuMeter);
        return;
    }

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] - 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / bufferLength);
    // Use a more dynamic range for the volume calculation
    // RMS of 128 is full scale for 8-bit, but voice is usually much lower
    const volume = Math.min(1, rms / 100); 

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background segments
    const numSegments = 20;
    const segmentGap = 2;
    const segmentWidth = (canvas.width - (numSegments - 1) * segmentGap) / numSegments;
    
    // Convert volume to dB
    const db = 20 * Math.log10(volume + 0.0001); // Convert to dB
    // Map -40dB to 0dB to 0-1 range for visualization
    const normalizedDb = Math.max(0, (db + 40) / 40); 
    const activeSegments = Math.round(normalizedDb * numSegments);

    for (let i = 0; i < numSegments; i++) {
      const x = i * (segmentWidth + segmentGap);
      if (i < activeSegments) {
        // Active segment
        if (i < numSegments * 0.7) ctx.fillStyle = '#10b981'; // emerald-500
        else if (i < numSegments * 0.9) ctx.fillStyle = '#f59e0b'; // amber-500
        else ctx.fillStyle = '#ef4444'; // red-500
      } else {
        // Inactive segment
        ctx.fillStyle = '#27272a'; // zinc-800
      }
      
      // Draw rounded rectangle for each segment
      const radius = 2;
      ctx.beginPath();
      ctx.moveTo(x + radius, 0);
      ctx.lineTo(x + segmentWidth - radius, 0);
      ctx.quadraticCurveTo(x + segmentWidth, 0, x + segmentWidth, radius);
      ctx.lineTo(x + segmentWidth, canvas.height - radius);
      ctx.quadraticCurveTo(x + segmentWidth, canvas.height, x + segmentWidth - radius, canvas.height);
      ctx.lineTo(x + radius, canvas.height);
      ctx.quadraticCurveTo(x, canvas.height, x, canvas.height - radius);
      ctx.lineTo(x, radius);
      ctx.quadraticCurveTo(x, 0, x + radius, 0);
      ctx.closePath();
      ctx.fill();
    }

    animationFrameRef.current = requestAnimationFrame(drawVuMeter);
  };

  useEffect(() => {
    if (isRecording || isMonitoring) {
      drawVuMeter();
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording, isMonitoring, isPaused]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (sourceStreamRef.current) {
        sourceStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startMonitoring = async () => {
    setErrorMsg(null);
    try {
      const constraints = {
        audio: studioMode ? {
          autoGainControl: false,
          echoCancellation: false,
          noiseSuppression: false,
          channelCount: 2,
          sampleRate: 48000,
          sampleSize: 16
        } : {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      sourceStreamRef.current = stream;
      
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = micGain;
      gainNodeRef.current = gainNode;
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      source.connect(gainNode);
      gainNode.connect(analyser);
      
      setIsMonitoring(true);
      drawVuMeter();
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      setErrorMsg("שגיאה בגישה למיקרופון: " + err.message);
    }
  };

  const stopMonitoring = () => {
    if (sourceStreamRef.current) {
      sourceStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close();
    }
    setIsMonitoring(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const startRecording = async () => {
    setErrorMsg(null);
    try {
      let stream = sourceStreamRef.current;
      let audioCtx = audioCtxRef.current;
      
      if (!isMonitoring || !stream || !audioCtx) {
        const constraints = {
          audio: studioMode ? {
            autoGainControl: false,
            echoCancellation: false,
            noiseSuppression: false,
            channelCount: 2,
            sampleRate: 48000,
            sampleSize: 16
          } : {
            autoGainControl: true,
            echoCancellation: true,
            noiseSuppression: true
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        sourceStreamRef.current = stream;
        audioCtx = new AudioContext();
        audioCtxRef.current = audioCtx;
      }

      const source = audioCtx.createMediaStreamSource(stream);
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = micGain;
      gainNodeRef.current = gainNode;
      const destination = audioCtx.createMediaStreamDestination();
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      source.connect(gainNode);
      gainNode.connect(analyser);
      analyser.connect(destination);

      const mediaRecorder = new MediaRecorder(destination.stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        if (sourceStreamRef.current) {
          sourceStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
          audioCtxRef.current.close();
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsMonitoring(false);
      setIsPaused(false);
      setRecordingTime(0);
      
      // Start VU meter if not already running
      if (!animationFrameRef.current) {
        drawVuMeter();
      }
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Error accessing microphone:", err);
      if (err.name === 'NotAllowedError') {
        setErrorMsg("אין הרשאה למיקרופון. אנא אשר גישה בדפדפן.");
      } else if (err.name === 'NotFoundError') {
        setErrorMsg("לא נמצא מיקרופון במחשב זה.");
      } else {
        setErrorMsg("שגיאה בגישה למיקרופון: " + err.message);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRecordingTime(0);
  };

  const saveRecording = () => {
    if (audioBlob) {
      const extension = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
      const file = new File([audioBlob], `recording-${new Date().toISOString().slice(0,10)}.${extension}`, { type: audioBlob.type });
      onSave(file);
      deleteRecording(); // Reset after saving
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 flex flex-col items-center gap-2 w-full">
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">הקלטת אודיו</h3>
      
      {errorMsg && (
        <div className="text-red-400 text-xs text-center bg-red-900/20 p-2 rounded-md w-full border border-red-900/50">
          {errorMsg}
        </div>
      )}

      <div className="text-2xl font-mono font-light text-white tracking-wider">
        {formatTime(recordingTime)}
      </div>

      {!audioUrl && (
        <div className="w-full px-2 flex flex-col gap-1.5">
          <div className="flex justify-between w-full items-center">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-zinc-300">{Math.round(micGain * 100)}%</span>
              <button 
                onClick={() => setMicGain(1)}
                className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-orange-500 px-2 py-0.5 rounded border border-zinc-700 transition-colors font-bold"
                title="איפוס ל-100%"
              >
                איפוס
              </button>
            </div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-tight">עוצמת מיקרופון</label>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={micGain}
            onChange={(e) => setMicGain(parseFloat(e.target.value))}
            className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          
          <div className="flex items-center justify-between mt-2 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">מצב סטודיו (איכות מקצועית)</span>
              <span className="text-[9px] text-zinc-500">מבטל סינון רעשים מובנה להקלטה נקייה ממיקרופון חיצוני</span>
            </div>
            <button 
              onClick={() => {
                setStudioMode(!studioMode);
                if (isMonitoring && !isRecording) {
                  stopMonitoring();
                  // It will require user to click "Prepare" again, which is safer
                }
              }}
              disabled={isRecording}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${studioMode ? 'bg-orange-500' : 'bg-zinc-700'} ${isRecording ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${studioMode ? '-translate-x-5' : '-translate-x-1'}`} />
            </button>
          </div>
          
          {(isRecording || isMonitoring) && (
            <div className="w-full mt-2">
              <div className="flex justify-between text-[8px] text-zinc-500 mb-0.5 px-0.5 font-mono" dir="ltr">
                <span>0dB</span>
                <span>6dB-</span>
                <span>12dB-</span>
                <span>24dB-</span>
                <span>60dB-</span>
              </div>
              <div className="w-full h-2.5 bg-zinc-800 rounded-sm overflow-hidden border border-zinc-700/30">
                <canvas ref={canvasRef} width="300" height="10" className="w-full h-full" />
              </div>
            </div>
          )}
        </div>
      )}

      {!audioUrl ? (
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <div className="flex items-center gap-2">
              {!isMonitoring ? (
                <button 
                  onClick={startMonitoring}
                  className="px-4 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center gap-2 transition-all border border-zinc-700 shadow-lg"
                  title="הכנה להקלטה"
                >
                  <Mic className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-xs font-medium">הכנה להקלטה</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={stopMonitoring}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 flex items-center gap-2 transition-all border border-zinc-700"
                    title="ביטול"
                  >
                    <span className="text-xs">ביטול</span>
                  </button>
                  <button 
                    onClick={startRecording}
                    className="px-4 py-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 transition-all shadow-lg shadow-red-500/20"
                    title="התחל הקלטה"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">התחל הקלטה</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {isPaused ? (
                <button 
                  onClick={resumeRecording}
                  className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 flex items-center justify-center text-white transition-all"
                  title="המשך הקלטה"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button 
                  onClick={pauseRecording}
                  className="w-8 h-8 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white transition-all"
                  title="השהה הקלטה"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={stopRecording}
                className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-white transition-all"
                title="עצור הקלטה"
              >
                <Square className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 w-full">
          <audio src={audioUrl} controls className="w-full h-8" />
          <div className="flex items-center gap-3">
            <button 
              onClick={deleteRecording}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-300 flex items-center gap-2 transition-all text-sm"
            >
              <Trash2 className="w-4 h-4" />
              מחק
            </button>
            <button 
              onClick={saveRecording}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              הוסף לעריכה
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
