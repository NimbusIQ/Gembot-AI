import React, { useState, useRef, useEffect } from 'react';
import { PageTitle, Tab, TabGroup, ActionButton, ErrorState } from '../components/shared';
import { MaterialSymbol } from '../components/icons';
// FIX: Removed non-exported type 'LiveSession'.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/media';


type ActiveTab = 'conversation' | 'tts';

const AudioStudio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('conversation');

    const resetState = () => {
        // This function can be expanded to reset state when switching tabs
    }

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        resetState();
    }

    return (
        <div className="flex flex-col h-full">
            <PageTitle title="Audio Studio" subtitle="Engage in real-time conversations and generate speech." />
            <TabGroup>
                <Tab label="Live Conversation" isActive={activeTab === 'conversation'} onClick={() => handleTabChange('conversation')} />
                <Tab label="Text-to-Speech" isActive={activeTab === 'tts'} onClick={() => handleTabChange('tts')} />
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
    
    // FIX: Use 'any' for the session ref as 'LiveSession' is not an exported type.
    const sessionRef = useRef<any | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);

    const stopConversation = () => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        setIsActive(false);
        setIsConnecting(false);
    };
    
    useEffect(() => {
        // Cleanup on component unmount
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

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsActive(true);
                        
                        // Input audio processing
                        // FIX: Cast window to 'any' to support 'webkitAudioContext' for older browsers.
                        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        audioContextRef.current = inputAudioContext;
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob: Blob = {
                                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
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

                        // Handle audio output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio) {
                            if (!outputAudioContextRef.current) {
                                // FIX: Cast window to 'any' to support 'webkitAudioContext' for older browsers.
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
                        setError(`An error occurred: ${e.message}`);
                        stopConversation();
                    },
                    onclose: (e: CloseEvent) => {
                        stopConversation();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                },
            });
            sessionRef.current = await sessionPromise;

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setIsConnecting(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full p-4 items-center">
            <div className="w-full max-w-2xl">
                <div className="flex justify-center mb-6">
                    {!isActive ? (
                        <button onClick={startConversation} disabled={isConnecting} className="px-8 py-4 bg-cyan-600 text-white rounded-full font-bold text-lg hover:bg-cyan-700 transition-all disabled:bg-gray-600 flex items-center">
                            <MaterialSymbol icon={isConnecting ? "hourglass_top" : "play_arrow"} className="mr-2" />
                            {isConnecting ? "Connecting..." : "Start Conversation"}
                        </button>
                    ) : (
                        <button onClick={stopConversation} className="px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg hover:bg-red-700 transition-all flex items-center">
                             <MaterialSymbol icon="stop" className="mr-2" />
                            Stop Conversation
                        </button>
                    )}
                </div>
                {isActive && (
                     <div className="text-center mb-6">
                        <div className="inline-block relative">
                             <div className="h-16 w-16 bg-green-500 rounded-full animate-ping"></div>
                             <MaterialSymbol icon="mic" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl text-white" />
                        </div>
                        <p className="text-gray-300 mt-2">Listening...</p>
                    </div>
                )}
                 {error && <div className="my-4"><ErrorState error={error} /></div>}
                <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 h-96 overflow-y-auto">
                    {transcription.map((turn, i) => (
                        <div key={i}>
                            <p><strong className="text-cyan-400">You:</strong> {turn.user}</p>
                            <p><strong className="text-teal-400">Model:</strong> {turn.model}</p>
                        </div>
                    ))}
                     {(currentTurn.user || currentTurn.model) && (
                         <div>
                            <p className="text-gray-400"><strong className="text-cyan-400">You:</strong> {currentTurn.user}</p>
                            <p className="text-gray-400"><strong className="text-teal-400">Model:</strong> {currentTurn.model}</p>
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
                     // FIX: Cast window to 'any' to support 'webkitAudioContext' for older browsers.
                     audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                }
                const audioCtx = audioContextRef.current;
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
            } else {
                throw new Error("No audio data received from API.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full p-4 items-center">
             <div className="w-full max-w-2xl flex flex-col gap-4">
                 <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to generate speech..." className="w-full flex-grow bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm focus:ring-cyan-500 focus:border-cyan-500 transition resize-none" rows={8} />
                 <ActionButton onClick={handleGenerateSpeech} isLoading={isLoading} disabled={!text.trim() || isLoading} icon={<MaterialSymbol icon="volume_up" className="mr-2"/>}>
                    Generate & Play Speech
                 </ActionButton>
                 {error && <ErrorState error={error} />}
            </div>
        </div>
    );
};

export default AudioStudio;