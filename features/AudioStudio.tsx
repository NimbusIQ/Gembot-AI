
import React, { useState, useRef, useEffect } from 'react';
import { PageTitle, Tab, TabGroup, ActionButton, ErrorState } from '../components/shared';
import { MaterialSymbol } from '../components/icons';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/media';


type ActiveTab = 'conversation' | 'tts';

const AudioStudio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('conversation');

    return (
        <div className="flex flex-col h-full">
            <PageTitle title="Aural Studio" subtitle="Real-time sensory interaction and vocal synthesis." />
            <TabGroup>
                <Tab label="Live Intelligence" icon="record_voice_over" isActive={activeTab === 'conversation'} onClick={() => setActiveTab('conversation')} />
                <Tab label="Neural TTS" icon="graphic_eq" isActive={activeTab === 'tts'} onClick={() => setActiveTab('tts')} />
            </TabGroup>
            <div className="flex-grow">
                {activeTab === 'conversation' && <LiveConversation />}
                {activeTab === 'tts' && <TextToSpeech />}
            </div>
        </div>
    );
};

const LiveConversation: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcription, setTranscription] = useState<{user: string, model: string}[]>([]);
    const [currentTurn, setCurrentTurn] = useState({user: '', model: ''});
    const [enableVision, setEnableVision] = useState(false);
    
    const sessionRef = useRef<any | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameIntervalRef = useRef<number | null>(null);

    const stopConversation = () => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
            videoStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        setIsActive(false);
        setIsConnecting(false);
    };
    
    useEffect(() => {
        return () => stopConversation();
    }, []);

    const startConversation = async () => {
        if (isActive || isConnecting) return;
        
        setIsConnecting(true);
        setError(null);
        setTranscription([]);
        setCurrentTurn({user: '', model: ''});

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            if (enableVision) {
                const vStream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoStreamRef.current = vStream;
                if (videoRef.current) videoRef.current.srcObject = vStream;
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsActive(true);
                        
                        // Audio streaming
                        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = inputAudioContext;
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (e) => {
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);

                        // Video streaming
                        if (enableVision && videoRef.current && canvasRef.current) {
                            const ctx = canvasRef.current.getContext('2d');
                            frameIntervalRef.current = window.setInterval(() => {
                                if (ctx && videoRef.current) {
                                    canvasRef.current!.width = videoRef.current.videoWidth / 2; // Downscale for bandwidth
                                    canvasRef.current!.height = videoRef.current.videoHeight / 2;
                                    ctx.drawImage(videoRef.current, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                                    canvasRef.current!.toBlob(async (blob) => {
                                        if (blob) {
                                            const reader = new FileReader();
                                            reader.readAsDataURL(blob);
                                            reader.onloadend = () => {
                                                const base64 = (reader.result as string).split(',')[1];
                                                sessionPromise.then(session => session.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                                            };
                                        }
                                    }, 'image/jpeg', 0.5);
                                }
                            }, 1000); // Send 1 frame per second
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, user: prev.user + message.serverContent.inputTranscription.text }));
                        }
                        if (message.serverContent?.outputTranscription) {
                            setCurrentTurn(prev => ({ ...prev, model: prev.model + message.serverContent.outputTranscription.text }));
                        }
                         if (message.serverContent?.turnComplete) {
                            setTranscription(prev => [...prev, currentTurn]);
                            setCurrentTurn({user: '', model: ''});
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            if (!outputAudioContextRef.current) {
                                outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                            }
                            const outputCtx = outputAudioContextRef.current;
                            const nextStartTime = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                            const source = outputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputCtx.destination);
                            source.start(nextStartTime);
                            nextStartTimeRef.current = nextStartTime + audioBuffer.duration;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        setError(`Neural connection interrupted: ${e.message}`);
                        stopConversation();
                    },
                    onclose: () => stopConversation(),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: enableVision ? "You have visual perception. Describe what you see if asked." : "You are a helpful Aural Assistant."
                },
            });
            sessionRef.current = await sessionPromise;

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Environment capture failed.');
            setIsConnecting(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full lg:flex-row gap-8">
            <div className="lg:w-1/2 flex flex-col space-y-6">
                <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 flex flex-col items-center justify-center space-y-8 min-h-[400px]">
                    {!isActive ? (
                        <div className="text-center space-y-8 w-full max-w-sm">
                            <div className="flex flex-col items-center justify-center p-8 border border-white/5 rounded-2xl bg-white/2">
                                <MaterialSymbol icon="settings_voice" className="text-6xl text-cyan-400 mb-4 animate-pulse" />
                                <h3 className="text-xl font-bold text-white">Initialize Protocol</h3>
                                <p className="text-slate-500 text-sm mt-2">Ultra-low latency sub-modal connection.</p>
                            </div>
                            
                            <div className="flex items-center justify-center space-x-4">
                                <label className="flex items-center cursor-pointer space-x-3 bg-white/5 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors">
                                    <input type="checkbox" checked={enableVision} onChange={e => setEnableVision(e.target.checked)} className="h-4 w-4 bg-slate-700 border-white/10 text-cyan-500 rounded focus:ring-cyan-500" />
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Enable Live Vision</span>
                                </label>
                            </div>

                            <ActionButton onClick={startConversation} isLoading={isConnecting} variant="primary" icon={<MaterialSymbol icon="bolt" />}>
                                {isConnecting ? "Establishing..." : "Connect Neural Link"}
                            </ActionButton>
                        </div>
                    ) : (
                        <div className="w-full space-y-8 flex flex-col items-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-cyan-500/20 blur-3xl animate-pulse"></div>
                                <div className="h-24 w-24 rounded-full bg-cyan-500 flex items-center justify-center relative z-10 shadow-[0_0_50px_rgba(34,211,238,0.4)]">
                                    <MaterialSymbol icon="mic" className="text-4xl text-black" />
                                </div>
                            </div>
                            
                            <div className="text-center">
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter">Link Active</h3>
                                <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mt-1">Streaming Telemetry</p>
                            </div>

                            {enableVision && (
                                <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-white/10 bg-black aspect-video">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover grayscale opacity-50" />
                                    <canvas ref={canvasRef} className="hidden" />
                                </div>
                            )}

                            <ActionButton onClick={stopConversation} variant="danger" icon={<MaterialSymbol icon="link_off" />}>
                                Disconnect Protocol
                            </ActionButton>
                        </div>
                    )}
                </div>
                {error && <ErrorState error={error} />}
            </div>

            <div className="lg:w-1/2 flex flex-col h-full bg-slate-950 border border-white/5 rounded-3xl overflow-hidden">
                <div className="bg-white/5 px-6 py-4 flex items-center border-b border-white/5">
                    <MaterialSymbol icon="receipt_long" className="text-slate-500 mr-3" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telemetry Log</span>
                </div>
                
                <div className="flex-grow p-6 overflow-y-auto custom-scrollbar space-y-6 min-h-[400px]">
                    {transcription.length === 0 && !currentTurn.user && !currentTurn.model && (
                        <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                             <MaterialSymbol icon="forum" className="text-6xl mb-4" />
                             <p className="text-xs font-black uppercase tracking-widest">No Interaction Logs</p>
                        </div>
                    )}
                    {transcription.map((turn, i) => (
                        <div key={i} className="space-y-3 animate-fade-in">
                            <div className="flex flex-col space-y-1">
                                <span className="text-[8px] font-black uppercase text-cyan-400">Subject</span>
                                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-4 py-3 text-sm text-slate-200">{turn.user}</div>
                            </div>
                            <div className="flex flex-col space-y-1">
                                <span className="text-[8px] font-black uppercase text-slate-500">Nimbus IQ</span>
                                <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-300 italic">{turn.model}</div>
                            </div>
                        </div>
                    ))}
                    {(currentTurn.user || currentTurn.model) && (
                         <div className="space-y-3">
                            {currentTurn.user && (
                                <div className="flex flex-col space-y-1 animate-pulse">
                                    <span className="text-[8px] font-black uppercase text-cyan-400">Streaming Input</span>
                                    <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-2xl px-4 py-3 text-sm text-slate-400">{currentTurn.user}</div>
                                </div>
                            )}
                            {currentTurn.model && (
                                <div className="flex flex-col space-y-1 animate-pulse">
                                    <span className="text-[8px] font-black uppercase text-slate-500">Synthesizing Response</span>
                                    <div className="bg-white/5 border border-white/5 rounded-2xl px-4 py-3 text-sm text-slate-500 italic">{currentTurn.model}</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const TextToSpeech: React.FC = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const handleGenerateSpeech = async () => {
        if (!text.trim()) return;
        setIsLoading(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text }] }],
                config: { responseModalities: [Modality.AUDIO] },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                     audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                }
                const audioCtx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
            } else {
                throw new Error("No binary audio data resolved.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Vocal synthesis failure.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center py-10">
             <div className="w-full max-w-2xl bg-slate-900 border border-white/5 p-8 rounded-3xl space-y-6 shadow-2xl">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Script</label>
                    <textarea 
                        value={text} 
                        onChange={(e) => setText(e.target.value)} 
                        placeholder="Enter linguistic data for vocal synthesis..." 
                        className="w-full bg-slate-950 border border-white/10 rounded-2xl p-6 text-sm font-medium focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all resize-none min-h-[200px]" 
                    />
                 </div>
                 
                 <ActionButton onClick={handleGenerateSpeech} isLoading={isLoading} disabled={!text.trim() || isLoading} variant="primary" icon={<MaterialSymbol icon="record_voice_over" />}>
                    Initialize Vocalization
                 </ActionButton>
                 
                 {error && <ErrorState error={error} />}
                 
                 <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-white/2 rounded-2xl border border-white/5 text-center">
                        <MaterialSymbol icon="hearing" className="text-2xl text-slate-600 mb-2" />
                        <p className="text-[10px] font-black uppercase text-slate-500">Hi-Fi Audio</p>
                    </div>
                    <div className="p-4 bg-white/2 rounded-2xl border border-white/5 text-center">
                        <MaterialSymbol icon="speed" className="text-2xl text-slate-600 mb-2" />
                        <p className="text-[10px] font-black uppercase text-slate-500">Sub-Second Latency</p>
                    </div>
                    <div className="p-4 bg-white/2 rounded-2xl border border-white/5 text-center">
                        <MaterialSymbol icon="palette" className="text-2xl text-slate-600 mb-2" />
                        <p className="text-[10px] font-black uppercase text-slate-500">Vocal Inflection</p>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default AudioStudio;
