
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, Content } from '@google/genai';
import type { ChatMessage } from '../types';
import { PageTitle, ErrorState } from '../components/shared';
import { LoadingIcon, MaterialSymbol } from '../components/icons';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';

const Chatbot: React.FC = () => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [model, setModel] = useState('gemini-3-pro-preview'); // Upgrade default to Pro for "DK" quality
    
    const chatRef = useRef<Chat | null>(null);
    const endOfMessagesRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);
    
    useEffect(() => {
        chatRef.current = null;
    }, [model])

    const getChat = () => {
        if (!chatRef.current) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            chatRef.current = ai.chats.create({
                model: model,
                history: history as Content[],
                config: {
                    systemInstruction: "You are the Nimbus IQ Neural Architect. You assist developers in building multimodal applications using the Google GenAI SDK. You have access to the system ledger of assets."
                }
            });
        }
        return chatRef.current;
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
        setHistory(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            const chat = getChat();
            const result = await chat.sendMessageStream({ message: input });
            
            let currentResponse = '';
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: '' }] }]);

            for await (const chunk of result) {
                currentResponse += chunk.text;
                setHistory(prev => {
                    const newHistory = [...prev];
                    newHistory[newHistory.length - 1] = { role: 'model', parts: [{ text: currentResponse }] };
                    return newHistory;
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            setHistory(prev => prev.slice(0, -1));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-150px)]">
            <PageTitle title="Cognitive Chat" subtitle="Architect neural logic and multimodal chains." />
            
            <div className="flex items-center space-x-2 mb-6">
                <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full flex items-center space-x-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Model: {model}</span>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                {history.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-4">
                        <div className="p-4 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                            <LoadingIcon className="h-12 w-12 text-cyan-400" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest max-w-[200px]">Waiting for linguistic input...</p>
                    </div>
                )}
                {history.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl lg:max-w-2xl px-6 py-4 rounded-3xl ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
                             <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.parts[0].text}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                 {isLoading && history[history.length-1]?.role === 'user' && (
                    <div className="flex justify-start">
                         <div className="px-6 py-4 rounded-3xl chat-bubble-model flex items-center">
                            <div className="flex space-x-1">
                                <div className="h-1 w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="h-1 w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="h-1 w-1 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {error && <div className="mt-4"><ErrorState error={error} /></div>}

            <form onSubmit={handleSendMessage} className="mt-6">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSendMessage(e); e.preventDefault(); }}}
                        placeholder="Architect a neural workflow..."
                        rows={1}
                        className="relative w-full bg-slate-900 border border-white/10 rounded-2xl p-4 pr-16 text-sm focus:ring-2 focus:ring-cyan-500/50 outline-none transition resize-none placeholder:text-slate-700"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-cyan-500 text-black hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 transition-all">
                         {/* Fix: Added missing MaterialSymbol import */}
                         <MaterialSymbol icon="send" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
