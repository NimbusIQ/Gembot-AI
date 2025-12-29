
import React, { useState } from 'react';
import { MaterialSymbol } from '../components/icons';
import { ActionButton } from '../components/shared';

const NeuralStudio: React.FC = () => {
    const [activeFlow, setActiveFlow] = useState('Default_Synthesis');
    const [isCompiling, setIsCompiling] = useState(false);

    const nodes = [
        { id: '1', type: 'Linguistic', label: 'Prompt Engine', status: 'ready', icon: 'text_fields' },
        { id: '2', type: 'Cognitive', label: 'Reasoning Pro', status: 'ready', icon: 'psychology' },
        { id: '3', type: 'Vision', label: 'Imagen Synthesis', status: 'idle', icon: 'visibility' },
    ];

    const mockCode = `
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Multimodal Synthesis Chain
const response = await ai.models.generateImages({
  model: 'imagen-4.0-generate-001',
  prompt: 'A cyberpunk landscape with volumetric lighting',
  config: {
    aspectRatio: '16:9',
    outputMimeType: 'image/jpeg'
  }
});
    `.trim();

    return (
        <div className="flex h-full flex-col bg-slate-950 overflow-hidden">
            {/* IDE Header/Toolbar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-900/30">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 px-3 py-1 bg-white/5 rounded-lg border border-white/5">
                        <MaterialSymbol icon="folder_open" className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-300">{activeFlow}.flow</span>
                    </div>
                    <div className="h-4 w-px bg-white/10"></div>
                    <div className="flex items-center space-x-3">
                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Run Flow</button>
                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white">Debug</button>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <ActionButton 
                        variant="primary" 
                        className="!py-1.5 !px-4 !rounded-lg"
                        icon={<MaterialSymbol icon="rocket_launch" />}
                        isLoading={isCompiling}
                        onClick={() => {
                            setIsCompiling(true);
                            setTimeout(() => setIsCompiling(false), 2000);
                        }}
                    >
                        Deploy Agent
                    </ActionButton>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex overflow-hidden">
                {/* Visual Flow Architect */}
                <div className="flex-grow relative bg-[#050505] overflow-hidden group">
                    {/* Grid Background */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#22d3ee 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative flex items-center space-x-20">
                            {nodes.map((node, i) => (
                                <React.Fragment key={node.id}>
                                    <div className="relative z-10 w-48 bg-slate-900 border border-white/10 rounded-2xl p-4 shadow-2xl hover:border-cyan-500/50 transition-all cursor-pointer group/node">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="p-2 bg-cyan-500/10 rounded-lg">
                                                <MaterialSymbol icon={node.icon} className="text-cyan-400" />
                                            </div>
                                            <div className={`h-2 w-2 rounded-full ${node.status === 'ready' ? 'bg-green-500' : 'bg-slate-700 animate-pulse'}`}></div>
                                        </div>
                                        <h4 className="text-xs font-black uppercase text-white mb-1">{node.label}</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{node.type} Node</p>
                                        
                                        {/* Port connectors */}
                                        <div className="absolute top-1/2 -left-1.5 h-3 w-3 rounded-full bg-slate-900 border border-cyan-500/30 -translate-y-1/2"></div>
                                        <div className="absolute top-1/2 -right-1.5 h-3 w-3 rounded-full bg-slate-900 border border-cyan-500/30 -translate-y-1/2"></div>
                                    </div>
                                    {i < nodes.length - 1 && (
                                        <div className="relative flex-grow">
                                            <div className="h-0.5 w-20 bg-gradient-to-r from-cyan-500/50 to-blue-500/50 animate-pulse"></div>
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-slate-900 border border-white/5 rounded-full">
                                                <MaterialSymbol icon="chevron_right" className="text-[10px] text-cyan-400" />
                                            </div>
                                        </div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-6 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                        X: 142.0 | Y: -48.2 | Zoom: 1.0x
                    </div>
                </div>

                {/* Properties & Code Inspector */}
                <div className="w-[450px] flex flex-col border-l border-white/5 bg-slate-900/40">
                    <div className="flex-grow p-6 overflow-y-auto custom-scrollbar">
                        <div className="mb-8">
                            <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center">
                                <MaterialSymbol icon="terminal" className="mr-2 text-cyan-400" />
                                Neural Snippet
                            </h3>
                            <div className="bg-black/60 rounded-2xl border border-white/10 p-4 font-mono text-[11px] leading-relaxed relative group/code">
                                <pre className="text-slate-400 overflow-x-auto whitespace-pre">
                                    {mockCode}
                                </pre>
                                <button 
                                    className="absolute top-4 right-4 p-2 bg-white/5 rounded-lg opacity-0 group-hover/code:opacity-100 transition-opacity hover:bg-white/10"
                                    onClick={() => navigator.clipboard.writeText(mockCode)}
                                >
                                    <MaterialSymbol icon="content_copy" className="text-xs text-slate-300" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Properties</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase">Model Identifier</label>
                                    <div className="p-3 bg-white/5 rounded-xl text-xs font-bold text-white border border-white/5">gemini-3-pro-preview</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-600 uppercase">Temperature Control</label>
                                    <input type="range" className="w-full accent-cyan-500" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Console Pane */}
                    <div className="h-48 border-t border-white/5 bg-black/40 p-4 font-mono text-[10px]">
                        <div className="flex items-center justify-between mb-3 text-slate-600 uppercase font-black">
                            <span>Console Output</span>
                            <MaterialSymbol icon="keyboard_arrow_up" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-green-500/80">[SYSTEM] Neural environment initialized.</p>
                            <p className="text-slate-500">[INFO] Fetching weights for Imagen 4.0...</p>
                            <p className="text-cyan-400/80">[PIPELINE] Node 'Prompt Engine' validated.</p>
                            <div className="flex items-center space-x-1">
                                <span className="text-white animate-pulse">_</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeuralStudio;
