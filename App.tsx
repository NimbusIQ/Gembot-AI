
import React, { useState } from 'react';
import Header from './components/Header';
import FeatureGrid from './components/FeatureGrid';
import Chatbot from './features/Chatbot';
import ImageStudio from './features/ImageStudio';
import VideoStudio from './features/VideoStudio';
import AudioStudio from './features/AudioStudio';
import Search from './features/Search';
import NeuralStudio from './features/NeuralStudio'; // New IDE View
import { MaterialSymbol } from './components/icons';

export interface NeuralAsset {
  id: string;
  type: 'image' | 'text' | 'video' | 'audio';
  data: string;
  timestamp: number;
  metadata?: any;
}

const App: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [ledger, setLedger] = useState<NeuralAsset[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const addAssetToLedger = (asset: Omit<NeuralAsset, 'id' | 'timestamp'>) => {
    const newAsset: NeuralAsset = {
      ...asset,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
    };
    setLedger(prev => [newAsset, ...prev]);
    setIsSidebarOpen(true);
  };

  const renderFeature = () => {
    const commonProps = { onExportAsset: addAssetToLedger };
    switch (selectedFeature) {
      case 'chatbot': return <Chatbot {...commonProps} />;
      case 'image_studio': return <ImageStudio {...commonProps} />;
      case 'video_studio': return <VideoStudio {...commonProps} />;
      case 'audio_studio': return <AudioStudio {...commonProps} />;
      case 'search': return <Search {...commonProps} />;
      case 'ide': return <NeuralStudio {...commonProps} />;
      default: return <FeatureGrid onSelectFeature={setSelectedFeature} />;
    }
  };

  const clearFeature = () => setSelectedFeature(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <Header onLogoClick={clearFeature} showBackArrow={!!selectedFeature} />
      
      <div className="flex flex-grow overflow-hidden">
        {/* IDE Activity Bar - Always visible in IDE mode */}
        {selectedFeature === 'ide' && (
            <div className="w-16 flex flex-col items-center py-6 border-r border-white/5 bg-slate-950 gap-8 shrink-0">
                <button className="text-cyan-400 p-2 rounded-xl bg-cyan-400/10"><MaterialSymbol icon="account_tree" /></button>
                <button className="text-slate-600 hover:text-slate-400 p-2"><MaterialSymbol icon="search" /></button>
                <button className="text-slate-600 hover:text-slate-400 p-2"><MaterialSymbol icon="bug_report" /></button>
                <button className="text-slate-600 hover:text-slate-400 p-2"><MaterialSymbol icon="extension" /></button>
                <div className="mt-auto">
                    <button className="text-slate-600 hover:text-slate-400 p-2"><MaterialSymbol icon="settings" /></button>
                </div>
            </div>
        )}

        <main className={`flex-grow ${selectedFeature === 'ide' ? 'p-0' : 'container mx-auto p-4 md:p-8'} flex flex-col overflow-y-auto custom-scrollbar`}>
          <div className="animate-fade-in w-full h-full flex flex-col">
              {renderFeature()}
          </div>
        </main>

        {/* Neural Ledger Sidebar */}
        <aside className={`fixed right-0 top-[73px] bottom-0 w-80 bg-slate-900/80 backdrop-blur-2xl border-l border-white/5 transition-transform duration-500 z-40 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Neural Ledger</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Cross-Modality Assets</p>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-slate-500 hover:text-white">
                <MaterialSymbol icon="close" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4">
              {ledger.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale text-center p-8">
                  <MaterialSymbol icon="inventory_2" className="text-4xl mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">Synthesis pipeline idle. No assets captured.</p>
                </div>
              ) : (
                ledger.map(asset => (
                  <div key={asset.id} className="group relative bg-white/5 border border-white/5 rounded-xl p-3 hover:border-cyan-500/30 transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[8px] font-black uppercase text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-full">{asset.type}</span>
                       <span className="text-[8px] text-slate-600">{new Date(asset.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {asset.type === 'image' && <img src={asset.data} className="w-full h-24 object-cover rounded-lg mb-2 grayscale group-hover:grayscale-0 transition-all" />}
                    {asset.type === 'text' && <p className="text-[10px] text-slate-400 line-clamp-3 italic">"{asset.data}"</p>}
                    <div className="absolute inset-0 bg-cyan-500/0 group-hover:bg-cyan-500/5 transition-colors rounded-xl"></div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t border-white/5">
                <button className="w-full py-3 bg-cyan-600/10 border border-cyan-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-500/20 transition-all">
                  Initialize SDK Export
                </button>
            </div>
          </div>
        </aside>

        {/* Sidebar Toggle Handle */}
        {!isSidebarOpen && ledger.length > 0 && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-cyan-500 text-black p-2 rounded-l-xl shadow-2xl animate-pulse z-50"
          >
            <MaterialSymbol icon="chevron_left" />
          </button>
        )}
      </div>
    </div>
  );
};

export default App;
