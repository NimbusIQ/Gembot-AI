
import React, { useState, useRef } from 'react';
import { PageTitle, Tab, TabGroup, ActionButton, LoadingState, ErrorState, EmptyState, CameraCapture } from '../components/shared';
import { MaterialSymbol } from '../components/icons';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from '../utils/media';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';

interface ImageStudioProps {
  onExportAsset?: (asset: { type: 'image' | 'text', data: string }) => void;
}

const ImageStudio: React.FC<ImageStudioProps> = ({ onExportAsset }) => {
    const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'analyze'>('generate');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            setCapturedBase64(null);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
            setResult(null);
            setError(null);
            setShowCamera(false);
        }
    };

    const handleCameraCapture = (base64: string) => {
        setCapturedBase64(base64);
        setImageFile(null);
        setPreviewUrl(`data:image/jpeg;base64,${base64}`);
        setResult(null);
        setError(null);
        setShowCamera(false);
    };

    const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const ai = getAi();
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: aspectRatio as any,
                },
            });
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const dataUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            setResult(dataUrl);
            onExportAsset?.({ type: 'image', data: dataUrl });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Neural engine failure.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!prompt || (!imageFile && !capturedBase64)) return;
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const ai = getAi();
            const imageBase64 = imageFile ? await fileToBase64(imageFile) : capturedBase64!;
            const mimeType = imageFile ? imageFile.type : 'image/jpeg';
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [ { inlineData: { data: imageBase64, mimeType } }, { text: prompt } ] },
            });
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const dataUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                    setResult(dataUrl);
                    onExportAsset?.({ type: 'image', data: dataUrl });
                    return;
                }
            }
            throw new Error('No semantic image was synthesized.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Image processing aborted.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnalyze = async () => {
        if (!prompt || (!imageFile && !capturedBase64)) return;
        setIsLoading(true);
        setError(null);
        setResult(null);
        
        try {
            const ai = getAi();
            const imageBase64 = imageFile ? await fileToBase64(imageFile) : capturedBase64!;
            const mimeType = imageFile ? imageFile.type : 'image/jpeg';

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [ { inlineData: { data: imageBase64, mimeType } }, { text: prompt } ] },
            });
            setResult(response.text);
            onExportAsset?.({ type: 'text', data: response.text });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Vision analysis failure.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const ImageInputSection = () => (
        <div className="space-y-4">
            {showCamera ? (
                <CameraCapture onCapture={handleCameraCapture} />
            ) : (
                <div className="flex flex-col gap-2">
                    <div 
                        className="w-full h-48 bg-slate-900/50 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center text-center cursor-pointer hover:border-cyan-500/50 transition-all group overflow-hidden"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {previewUrl ? (
                            <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain transition-transform group-hover:scale-105" />
                        ) : (
                            <div className="text-slate-500">
                                <MaterialSymbol icon="cloud_upload" className="text-4xl mb-2" />
                                <p className="text-xs font-bold uppercase tracking-widest">Select Visual Data</p>
                            </div>
                        )}
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    </div>
                    <ActionButton variant="secondary" onClick={() => setShowCamera(true)} icon={<MaterialSymbol icon="photo_camera" />}>
                        Live Capture
                    </ActionButton>
                </div>
            )}
        </div>
    );

    const renderTabContent = () => {
        const isGenerate = activeTab === 'generate';
        const isEdit = activeTab === 'edit';
        const isAnalyze = activeTab === 'analyze';
        const canSubmit = prompt && (isGenerate || ((imageFile || capturedBase64) && (isEdit || isAnalyze)));

        return (
            <div className="flex-grow flex flex-col md:flex-row gap-10">
                <div className="md:w-[350px] flex flex-col gap-6 shrink-0">
                    {!isGenerate && <ImageInputSection />}
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Neural Instruction</label>
                        <textarea 
                            value={prompt} 
                            onChange={e => setPrompt(e.target.value)} 
                            placeholder={isGenerate ? "Describe a cinematic scene..." : isEdit ? "Modify environmental conditions..." : "Conduct semantic analysis..."} 
                            className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none resize-none placeholder:text-slate-600" 
                            rows={5} 
                        />
                    </div>

                    {isGenerate && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Geometry Protocol</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['1:1', '16:9', '9:16', '4:3'].map(ratio => (
                                    <button 
                                        key={ratio}
                                        onClick={() => setAspectRatio(ratio)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${aspectRatio === ratio ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-transparent text-slate-500 hover:bg-white/10'}`}
                                    >
                                        {ratio}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <ActionButton 
                      onClick={isGenerate ? handleGenerate : isEdit ? handleEdit : handleAnalyze} 
                      isLoading={isLoading} 
                      disabled={!canSubmit} 
                      variant="primary" 
                      icon={<MaterialSymbol icon="auto_awesome" />}
                    >
                        Initialize Synthesis
                    </ActionButton>
                </div>

                <div className="flex-grow">
                    <div className="h-full bg-slate-900/40 border border-white/5 rounded-3xl p-6 min-h-[500px] flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-2">
                                <div className="h-2 w-2 rounded-full bg-cyan-500"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Output Stream</span>
                            </div>
                        </div>
                        
                        <div className="flex-grow relative overflow-hidden rounded-2xl bg-black/20 flex items-center justify-center">
                            {isLoading && <LoadingState message="Synthesizing neural assets..." />}
                            {error && <ErrorState error={error} />}
                            {!isLoading && !error && !result && <EmptyState title="System Idle" message="Define a prompt to start generation." icon={<MaterialSymbol icon="blur_on" className="text-6xl" />} />}
                            
                            {result && !isLoading && (
                                activeTab === 'analyze' ? (
                                    <div className="w-full h-full overflow-y-auto custom-scrollbar p-6">
                                        <div className="prose prose-invert prose-cyan max-w-none">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                                        </div>
                                    </div>
                                ) : (
                                    <img src={result} alt="Generated result" className="max-h-full max-w-full object-contain animate-pop-in" />
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <PageTitle title="Vision Studio" subtitle="High-fidelity image synthesis and neural editing." />
            <TabGroup>
                <Tab label="Synthesize" icon="auto_awesome" isActive={activeTab === 'generate'} onClick={() => setActiveTab('generate')} />
                <Tab label="Neural Edit" icon="edit" isActive={activeTab === 'edit'} onClick={() => setActiveTab('edit')} />
                <Tab label="Vision Analysis" icon="visibility" isActive={activeTab === 'analyze'} onClick={() => setActiveTab('analyze')} />
            </TabGroup>
            <div className="flex-grow">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default ImageStudio;
