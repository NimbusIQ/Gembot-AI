
import React, { useState, useEffect, useRef } from 'react';
import { PageTitle, ActionButton, LoadingState, ErrorState, EmptyState, TabGroup, Tab } from '../components/shared';
import { MaterialSymbol } from '../components/icons';
import { GoogleGenAI, GenerateVideosOperation } from '@google/genai';
import { fileToBase64 } from '../utils/media';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';


type ActiveTab = 'text-to-video' | 'image-to-video' | 'analyze-video';

const VideoStudio: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('text-to-video');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const pollingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        const checkKey = async () => {
            setIsCheckingKey(true);
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setApiKeySelected(hasKey);
            setIsCheckingKey(false);
        };
        checkKey();

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        };
    }, []);

    const resetState = () => {
        setPrompt('');
        setImageFile(null);
        setVideoFile(null);
        setPreviewUrl(null);
        setError(null);
        setVideoUrl(null);
        setAnalysisResult(null);
        setIsLoading(false);
        setLoadingMessage('');
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        resetState();
    }

    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            setApiKeySelected(true);
        } catch (e) {
            setError("Authentication protocol failure.");
        }
    };
    
    const pollOperation = (operation: GenerateVideosOperation) => {
        setLoadingMessage("Synthesizing temporal buffers. This requires significant compute...");
        
        pollingIntervalRef.current = window.setInterval(async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const updatedOperation = await ai.operations.getVideosOperation({ operation });
                
                if (updatedOperation.done) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    if (updatedOperation.error) {
                         setError(`Temporal synthesis error: ${updatedOperation.error.message}`);
                         setIsLoading(false);
                         return;
                    }
                    setLoadingMessage("Finalizing data stream...");
                    const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                    if (downloadLink) {
                        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                        const blob = await response.blob();
                        setVideoUrl(URL.createObjectURL(blob));
                    } else {
                        setError("Video URI resolution failed.");
                    }
                    setIsLoading(false);
                } else {
                    const progress = updatedOperation.metadata?.progressPercent ?? 'unknown';
                    setLoadingMessage(`Temporal processing: ${progress}% calibrated.`);
                }
            } catch(e) {
                 if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                 setError(e instanceof Error ? e.message : 'Polling failure.');
                 setIsLoading(false);
            }
        }, 10000);
    };

    const handleGenerate = async () => {
        if (!prompt && activeTab === 'text-to-video') return;
        if (!imageFile && activeTab === 'image-to-video') return;

        resetState();
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            setLoadingMessage("Initializing Motion Pipeline...");

            let operation: GenerateVideosOperation;
            if (activeTab === 'image-to-video' && imageFile) {
                 const imageBase64 = await fileToBase64(imageFile);
                 operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt,
                    image: { imageBytes: imageBase64, mimeType: imageFile.type },
                    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio as '16:9' | '9:16' }
                 });
            } else {
                 operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt,
                    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio as '16:9' | '9:16' }
                 });
            }
            pollOperation(operation);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown generation error.';
            if (errorMessage.includes("Requested entity was not found.")) {
                setError("Invalid API Key scope. Re-authentication required.");
                setApiKeySelected(false);
            } else {
                 setError(errorMessage);
            }
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!videoFile || !prompt) return;
        setIsLoading(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            setLoadingMessage("Scanning temporal semantics...");
            
            const videoBase64 = await fileToBase64(videoFile);
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [
                    { parts: [ { inlineData: { data: videoBase64, mimeType: videoFile.type } }, { text: prompt } ] }
                ]
            });
            setAnalysisResult(response.text);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Video analysis failure.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
            setVideoUrl(null);
            setError(null);
        }
    };

    const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setVideoFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError(null);
        }
    }
    
    if (isCheckingKey) {
        return <LoadingState message="Authenticating credentials..." />;
    }

    if (!apiKeySelected) {
        return (
            <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto py-20 text-center animate-fade-in">
                <div className="p-6 bg-cyan-500/10 rounded-full border border-cyan-500/20 mb-8">
                    <MaterialSymbol icon="key" className="text-6xl text-cyan-400" />
                </div>
                <PageTitle title="Temporal Authorization" subtitle="Motion synthesis requires high-compute project clearance." />
                <div className="space-y-6">
                    <p className="text-slate-400 font-medium leading-relaxed">
                        Motion protocols are compute-intensive. You must provide a valid Gemini API key from a billable GCP project to initialize the Veo pipeline.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <ActionButton onClick={handleSelectKey} variant="primary" icon={<MaterialSymbol icon="vpn_key" />}>Select Credentials</ActionButton>
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center px-6 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors">Documentation Protocol</a>
                    </div>
                     {error && <div className="mt-8"><ErrorState error={error}/></div>}
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
            <PageTitle title="Motion Studio" subtitle="Generate and analyze temporal assets using Veo 3.1 & Gemini." />
            
            <TabGroup>
                <Tab label="Text-to-Video" icon="text_fields" isActive={activeTab === 'text-to-video'} onClick={() => handleTabChange('text-to-video')} />
                <Tab label="Image-to-Video" icon="image" isActive={activeTab === 'image-to-video'} onClick={() => handleTabChange('image-to-video')} />
                <Tab label="Analyze Video" icon="analytics" isActive={activeTab === 'analyze-video'} onClick={() => handleTabChange('analyze-video')} />
            </TabGroup>

            <div className="flex-grow flex flex-col lg:flex-row gap-10">
                <div className="lg:w-[380px] flex flex-col gap-6 shrink-0">
                    {activeTab === 'image-to-video' && (
                        <div 
                            className="w-full h-48 bg-slate-900 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-center cursor-pointer hover:border-cyan-500/50 transition-all group overflow-hidden" 
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" /> : <div className="text-slate-600"><MaterialSymbol icon="upload_file" className="text-4xl" /><p className="text-[10px] uppercase font-black tracking-widest mt-2">Upload Asset</p></div>}
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        </div>
                    )}

                    {activeTab === 'analyze-video' && (
                         <div 
                            className="w-full h-48 bg-slate-900 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-center cursor-pointer hover:border-cyan-500/50 transition-all group overflow-hidden" 
                            onClick={() => videoInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <video src={previewUrl} className="max-h-full w-full object-cover" />
                            ) : (
                                <div className="text-slate-600"><MaterialSymbol icon="movie" className="text-4xl" /><p className="text-[10px] uppercase font-black tracking-widest mt-2">Select Video Sample</p></div>
                            )}
                            <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoFileChange} className="hidden" />
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Instruction</label>
                        <textarea 
                            value={prompt} 
                            onChange={e => setPrompt(e.target.value)} 
                            placeholder={activeTab === 'analyze-video' ? "Describe the key movements in this clip..." : "A hyper-realistic cinematic tracking shot..."} 
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all outline-none resize-none placeholder:text-slate-700" 
                            rows={8} 
                        />
                    </div>

                    {activeTab !== 'analyze-video' && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Temporal Geometry</label>
                            <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-slate-900 border border-white/10 rounded-2xl p-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50">
                                <option value="16:9">Widescreen (16:9)</option>
                                <option value="9:16">Vertical (9:16)</option>
                            </select>
                        </div>
                    )}

                    <ActionButton 
                        onClick={activeTab === 'analyze-video' ? handleAnalyze : handleGenerate} 
                        isLoading={isLoading} 
                        disabled={isLoading || (activeTab === 'text-to-video' && !prompt) || (activeTab === 'image-to-video' && !imageFile) || (activeTab === 'analyze-video' && (!videoFile || !prompt))} 
                        variant="primary"
                        icon={<MaterialSymbol icon="play_circle" />}
                    >
                        {activeTab === 'analyze-video' ? 'Analyze Semantics' : 'Initialize Synthesis'}
                    </ActionButton>
                </div>

                <div className="flex-grow">
                     <div className="h-full bg-slate-900/40 border border-white/5 rounded-3xl p-6 min-h-[500px] flex flex-col">
                         <div className="flex items-center space-x-2 mb-6">
                            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Temporal Buffer</span>
                        </div>

                        <div className="flex-grow relative bg-black/40 rounded-2xl flex items-center justify-center overflow-hidden">
                            {isLoading && <LoadingState message={loadingMessage} details="Please maintain connection. Synthesis requires uninterrupted compute." />}
                            {error && <ErrorState error={error} />}
                            {!isLoading && !error && !videoUrl && !analysisResult && <EmptyState title="Buffer Empty" message="Enter neural instructions to generate or analyze motion." icon={<MaterialSymbol icon="movie_filter" className="text-6xl" />} />}
                            
                            {videoUrl && !isLoading && (
                                <video src={videoUrl} controls autoPlay loop className="max-h-full max-w-full rounded-md shadow-2xl" />
                            )}
                            
                            {analysisResult && !isLoading && (
                                <div className="w-full h-full overflow-y-auto custom-scrollbar p-8">
                                    <div className="prose prose-invert prose-blue max-w-none">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{analysisResult}</ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoStudio;
