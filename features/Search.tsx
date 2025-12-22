import React, { useState, useEffect } from 'react';
import { PageTitle, ActionButton, LoadingState, ErrorState, EmptyState } from '../components/shared';
import { MaterialSymbol } from '../components/icons';
import { GoogleGenAI, GroundingChunk, GenerateContentResponse, Tool } from '@google/genai';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';


interface Source {
    title: string;
    uri: string;
}

const Search: React.FC = () => {
    const [query, setQuery] = useState('');
    const [useMaps, setUseMaps] = useState(true);
    const [location, setLocation] = useState<{ lat: number, lon: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [sources, setSources] = useState<Source[]>([]);
    const [model, setModel] = useState('gemini-2.5-flash');
    const [showSettings, setShowSettings] = useState(false);
    
    useEffect(() => {
        if (useMaps && !location) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    });
                    setLocationError(null);
                },
                (err) => {
                    setLocationError(`Could not get location: ${err.message}. Maps grounding may be less accurate.`);
                }
            );
        }
    }, [useMaps, location]);

    const handleSearch = async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResult(null);
        setSources([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            
            const tools: Tool[] = [{ googleSearch: {} }];
            if (useMaps) {
                tools.push({ googleMaps: {} });
            }

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: model as "gemini-2.5-flash" | "gemini-2.5-pro",
                contents: query,
                config: {
                    tools: tools,
                    toolConfig: useMaps && location ? {
                        retrievalConfig: {
                            latLng: {
                                latitude: location.lat,
                                longitude: location.lon,
                            }
                        }
                    } : undefined,
                },
            });

            setResult(response.text);

            const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
            if (groundingChunks) {
                const extractedSources: Source[] = groundingChunks.flatMap((chunk: GroundingChunk) => {
                    const sources: Source[] = [];
                    if (chunk.web?.uri) {
                        sources.push({ title: chunk.web.title || 'Web Source', uri: chunk.web.uri });
                    }
                    if (chunk.maps?.uri) {
                        sources.push({ title: chunk.maps.title || 'Map Location', uri: chunk.maps.uri });
                    }
                    return sources;
                }).filter(s => s.uri !== '#');
                setSources(extractedSources);
            }
            
        } catch (err) {
// FIX: Corrected invalid `catch` syntax from `() => {}` to standard block statement.
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <PageTitle title="Grounded Search" subtitle="Get up-to-date answers grounded in Google Search & Maps." />
             <div className="flex flex-col gap-4">
                <div className="relative">
                     <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSearch(); e.preventDefault(); }}}
                        placeholder="Who won the latest F1 race?"
                        rows={2}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pr-24 text-sm focus:ring-cyan-500 focus:border-cyan-500 transition resize-none"
                        disabled={isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                            <MaterialSymbol icon="settings" />
                        </button>
                        <button onClick={handleSearch} disabled={isLoading || !query.trim()} className="p-2 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                            <MaterialSymbol icon="search" />
                        </button>
                    </div>
                </div>

                {showSettings && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 animate-fade-in">
                        <h3 className="text-sm font-semibold text-white mb-3">Search Settings</h3>
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="model-select" className="block text-sm font-medium text-gray-300 mb-1">AI Model</label>
                                <select id="model-select" value={model} onChange={e => setModel(e.target.value)} className="w-full bg-gray-700 border-gray-600 rounded-md py-1.5 px-2 text-sm focus:ring-cyan-500 focus:border-cyan-500">
                                    <option value="gemini-2.5-flash">Flash (Faster)</option>
                                    <option value="gemini-2.5-pro">Pro (More Thorough)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                                <input type="checkbox" id="use-maps" checked={useMaps} onChange={e => setUseMaps(e.target.checked)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-cyan-600 focus:ring-cyan-500" />
                                <label htmlFor="use-maps" className="text-sm text-gray-300">Ground with Google Maps (provides location)</label>
                            </div>
                        </div>
                    </div>
                )}
                
                {locationError && <p className="text-sm text-yellow-400 mt-2">{locationError}</p>}
            </div>

            <div className="flex-grow mt-6">
                 {isLoading && <LoadingState message="Searching..." />}
                 {error && <ErrorState error={error} />}
                 {!isLoading && !error && !result && <EmptyState title="Results will appear here" message="Enter a query to search with AI grounding." icon={<MaterialSymbol icon="travel_explore" className="text-5xl text-gray-500" />} />}
                 {result && (
                    <div className="bg-gray-800/50 rounded-lg p-4 h-full overflow-y-auto">
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                        </div>
                        {sources.length > 0 && (
                            <div className="mt-6 border-t border-gray-700 pt-4">
                                <h4 className="font-semibold text-white mb-2">Sources:</h4>
                                <ul className="list-disc pl-5 space-y-1">
                                    {sources.map((source, index) => (
                                        <li key={index}>
                                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline break-all">{source.title}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                 )}
            </div>
        </div>
    );
};

export default Search;