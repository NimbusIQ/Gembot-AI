import React, { useState, useEffect, useRef } from 'react';
import { PageTitle, ActionButton, LoadingState, ErrorState, EmptyState, TabGroup, Tab } from '../components/shared';
import { MaterialSymbol, SparklesIcon } from '../components/icons';
import { GoogleGenAI, GenerateVideosOperation, Video } from '@google/genai';
import { fileToBase64 } from '../utils/media';

type ActiveTab = 'text-to-video' | 'image-to-video';

const VideoStudio: React.FC = () => {
    const [apiKeySelected, setApiKeySelected] = useState(false);
    const [isCheckingKey, setIsCheckingKey] = useState(true);
    const [activeTab, setActiveTab] = useState<ActiveTab>('text-to-video');
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
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
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, []);

    const resetState = () => {
        setPrompt('');
        setImageFile(null);
        setPreviewUrl(null);
        setError(null);
        setVideoUrl(null);
        setIsLoading(false);
        setLoadingMessage('');
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
        }
    }

    const handleTabChange = (tab: ActiveTab) => {
        setActiveTab(tab);
        resetState();
    }

    const handleSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            setApiKeySelected(true); // Assume success after dialog opens
        } catch (e) {
            setError("Could not open API key selection dialog.");
        }
    };
    
    const pollOperation = (operation: GenerateVideosOperation) => {
        setLoadingMessage("Video generation started. This can take a few minutes...");
        
        pollingIntervalRef.current = window.setInterval(async () => {
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
                const updatedOperation = await ai.operations.getVideosOperation({ operation });
                
                if (updatedOperation.done) {
                    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                    if (updatedOperation.error) {
                         setError(`Error generating video: ${updatedOperation.error.message}`);
                         setIsLoading(false);
                         return;
                    }
                    setLoadingMessage("Fetching video...");
                    const downloadLink = updatedOperation.response?.generatedVideos?.[0]?.video?.uri;
                    if (downloadLink) {
                        // The response.body contains the MP4 bytes. You must append an API key when fetching from the download link.
                        const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
                        const blob = await response.blob();
                        setVideoUrl(URL.createObjectURL(blob));
                    } else {
                        setError("Video generation completed, but no video URI was found.");
                    }
                    setIsLoading(false);
                } else {
                    const progress = updatedOperation.metadata?.progressPercent ?? 'unknown';
                    setLoadingMessage(`Processing video... Progress: ${progress}%`);
                }
            } catch(e) {
                 if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
                 setError(e instanceof Error ? e.message : 'An error occurred while polling for video status.');
                 setIsLoading(false);
            }
        }, 10000); // Poll every 10 seconds
    };

    const handleGenerate = async () => {
        if (!prompt && activeTab === 'text-to-video') return;
        if (!imageFile && activeTab === 'image-to-video') return;

        resetState(); // Clear previous results
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            setLoadingMessage("Initializing video generation...");

            let operation: GenerateVideosOperation;
            if (activeTab === 'image-to-video' && imageFile) {
                 const imageBase64 = await fileToBase64(imageFile);
                 operation = await ai.models.generateVideos({
                    model: 'veo-3.1-fast-generate-preview',
                    prompt: prompt, // Prompt is optional for image-to-video
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
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            if (errorMessage.includes("Requested entity was not found.")) {
                setError("API Key is invalid or missing permissions. Please select a valid key.");
                setApiKeySelected(false);
            } else {
                 setError(errorMessage);
            }
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
    
    if (isCheckingKey) {
        return <LoadingState message="Checking API key status..." />;
    }

    if (!apiKeySelected) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <PageTitle title="API Key Required for Veo" subtitle="Video generation requires a valid API key with billing enabled." />
                <div className="max-w-md">
                    <p className="mb-4 text-gray-400">Please select an API key from your project to proceed. If you don't have one, you can create one in Google AI Studio. Ensure billing is enabled for your project.</p>
                    <ActionButton onClick={handleSelectKey} icon={<MaterialSymbol icon="key" className="mr-2" />}>Select API Key</ActionButton>
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm text-cyan-400 hover:text-cyan-300">Learn more about billing</a>
                     {error && <div className="mt-4"><ErrorState error={error}/></div>}
                </div>
            </div>
        );
    }
    
    const ImageUploadArea = () => (
        <div className="w-full h-48 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center text-center cursor-pointer hover:border-cyan-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
            {previewUrl ? <img src={previewUrl} alt="Preview" className="max-h-full max-w-full rounded-md" /> : <div className="text-gray-400"><MaterialSymbol icon="upload_file" className="text-4xl" /><p>Click to upload an image</p></div>}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <PageTitle title="Video Studio" subtitle="Generate stunning videos from text or images with Veo." />
             <TabGroup>
                <Tab label="Text-to-Video" isActive={activeTab === 'text-to-video'} onClick={() => handleTabChange('text-to-video')} />
                <Tab label="Image-to-Video" isActive={activeTab === 'image-to-video'} onClick={() => handleTabChange('image-to-video')} />
            </TabGroup>
             <div className="flex-grow flex flex-col md:flex-row gap-8">
                <div className="md:w-1/3 flex flex-col gap-4">
                    {activeTab === 'image-to-video' && <ImageUploadArea />}
                    <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={activeTab === 'image-to-video' ? "Optional: A neon hologram of a cat..." : "A neon hologram of a cat driving..."} className="w-full flex-grow bg-gray-800 border border-gray-600 rounded-lg p-3 text-sm focus:ring-cyan-500 focus:border-cyan-500 transition resize-none" rows={8} />
                    <div>
                        <label className="text-sm font-medium text-gray-300 mb-2 block">Aspect Ratio</label>
                        <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-2 px-2 text-sm focus:ring-cyan-500 focus:border-cyan-500">
                            <option value="16:9">Landscape (16:9)</option>
                            <option value="9:16">Portrait (9:16)</option>
                        </select>
                    </div>
                    <ActionButton onClick={handleGenerate} isLoading={isLoading} disabled={isLoading || (activeTab === 'text-to-video' && !prompt) || (activeTab === 'image-to-video' && !imageFile)} icon={<SparklesIcon className="-ml-1 mr-2 h-5 w-5"/>}>Generate Video</ActionButton>
                </div>
                <div className="flex-grow md:w-2/3">
                    {isLoading && <LoadingState message={loadingMessage} details="Please keep this window open. Video generation can take several minutes to complete." />}
                    {error && <ErrorState error={error} />}
                    {!isLoading && !error && !videoUrl && <EmptyState title="Video output will appear here" message="Enter a prompt and click Generate to create a video." icon={<MaterialSymbol icon="movie" className="text-5xl text-gray-500" />} />}
                    {videoUrl && (
                        <div className="w-full h-full flex items-center justify-center bg-black rounded-xl">
                            <video src={videoUrl} controls autoPlay loop className="max-h-full max-w-full rounded-md" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VideoStudio;
