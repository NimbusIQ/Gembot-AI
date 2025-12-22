import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse, Content } from '@google/genai';
import type { ChatMessage } from '../types';
import { PageTitle, ErrorState } from '../components/shared';
import { SparklesIcon, LoadingIcon } from '../components/icons';
import ReactMarkdown from 'https://esm.sh/react-markdown@9';
import remarkGfm from 'https://esm.sh/remark-gfm@4';


const Chatbot: React.FC = () => {
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [model, setModel] = useState('gemini-2.5-flash');
    
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
            const config = model === 'gemini-2.5-pro' ? { thinkingConfig: { thinkingBudget: 32768 } } : {};
             chatRef.current = ai.chats.create({
                model: model,
                history: history as Content[],
                config
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
            const message = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(message);
             setHistory(prev => prev.slice(0, -1)); // remove user message if send fails
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full max-h-[calc(100vh-150px)]">
            <PageTitle title="AI Chatbot" subtitle="Converse with powerful Gemini models." />
             <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700 flex items-center justify-center space-x-4 mb-4 self-start">
                <label className="text-sm font-medium text-gray-300">Select Model:</label>
                <select value={model} onChange={e => setModel(e.target.value)} className="bg-gray-700 border-gray-600 rounded-md py-1 px-2 text-sm focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="gemini-2.5-flash-lite">Flash Lite (Fastest)</option>
                    <option value="gemini-2.5-flash">Flash (Balanced)</option>
                    <option value="gemini-2.5-pro">Pro (Complex Tasks)</option>
                </select>
            </div>
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {history.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-model'}`}>
                             <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.parts[0].text}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                ))}
                 {isLoading && history[history.length-1]?.role === 'user' && (
                    <div className="flex justify-start">
                         <div className="max-w-xl lg:max-w-2xl px-4 py-3 rounded-lg chat-bubble-model flex items-center">
                            <LoadingIcon className="h-5 w-5 animate-spin text-cyan-400" />
                        </div>
                    </div>
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {error && <div className="mt-4"><ErrorState error={error} /></div>}

            <form onSubmit={handleSendMessage} className="mt-4">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { handleSendMessage(e); e.preventDefault(); }}}
                        placeholder="Type your message..."
                        rows={1}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-3 pr-20 text-sm focus:ring-cyan-500 focus:border-cyan-500 transition resize-none"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Chatbot;
