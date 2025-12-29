
import React from 'react';
import FeatureCard from './FeatureCard';

interface FeatureGridProps {
  onSelectFeature: (id: string) => void;
}

const features = {
  intelligence: [
    { id: 'chatbot', title: 'Cognitive Chat', icon: 'psychology', description: 'Advanced reasoning and multi-turn dialogue powered by Gemini 3 Pro.' },
    { id: 'search', title: 'Deep Search', icon: 'travel_explore', description: 'Grounded intelligence with real-time web and maps integration.' },
  ],
  senses: [
    { id: 'image_studio', title: 'Vision Studio', icon: 'visibility', description: 'High-fidelity image synthesis, live camera analysis, and neural editing.' },
    { id: 'video_studio', title: 'Motion Studio', icon: 'movie', description: 'Temporal generation with Veo 3.1 and deep video semantic analysis.' },
    { id: 'audio_studio', title: 'Aural Studio', icon: 'settings_voice', description: 'Ultra-low latency live voice interaction and high-fidelity speech synthesis.' },
  ],
};

const Section: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({ title, subtitle, children }) => (
    <div className="space-y-6">
        <div className="border-l-2 border-cyan-500/50 pl-4">
            <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
            <p className="text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children}
        </div>
    </div>
);


const FeatureGrid: React.FC<FeatureGridProps> = ({ onSelectFeature }) => {
  return (
    <div className="space-y-16 py-8">
        <div className="text-center space-y-4 animate-slide-in-bottom">
            <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
                Neural Platform v3.1
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                NIMBUS <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-white to-blue-500">IQ STUDIO</span>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                The Integrated Development Environment for multimodal AI. 
                Build, test, and deploy complex neural chains in one unified interface.
            </p>
            
            <div className="pt-8">
                <button 
                    onClick={() => onSelectFeature('ide')}
                    className="group relative px-8 py-4 bg-cyan-500 text-black font-black uppercase tracking-widest text-sm rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(34,211,238,0.3)]"
                >
                    <span className="relative z-10 flex items-center">
                        Initialize Neural IDE
                        <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">terminal</span>
                    </span>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
            </div>
        </div>

        <div className="space-y-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Section title="Component Library" subtitle="Individual modality nodes for linguistic and sensory synthesis">
                {features.intelligence.map(feature => <FeatureCard key={feature.id} {...feature} onSelect={onSelectFeature} />)}
                {features.senses.map(feature => <FeatureCard key={feature.id} {...feature} onSelect={onSelectFeature} />)}
            </Section>
        </div>
    </div>
  );
};

export default FeatureGrid;
