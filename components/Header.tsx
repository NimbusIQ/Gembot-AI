
import React from 'react';

interface HeaderProps {
  onLogoClick: () => void;
  showBackArrow: boolean;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, showBackArrow }) => {
  return (
    <header className="bg-slate-950/60 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <div 
            onClick={onLogoClick} 
            className="flex items-center cursor-pointer group"
            aria-label="Back to home"
        >
            <div className="flex items-center transition-transform duration-300 group-hover:scale-[1.02]">
                {showBackArrow && (
                    <div className="mr-4 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400 group-hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </div>
                )}
                <img src="https://storage.googleapis.com/aistudio-ux-team-data/demos/nimbus-logo.png" alt="Nimbus IQ Logo" className="h-10 w-10 mr-4 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]" />
                <div>
                    <h1 className="text-xl font-black text-white tracking-tighter leading-none">NIMBUS <span className="text-cyan-400">IQ</span></h1>
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mt-1">Generative Workspace</p>
                </div>
            </div>
        </div>

        <div className="hidden md:flex items-center space-x-6 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Compute</span>
            <span className="hover:text-cyan-400 cursor-pointer transition-colors">Safety</span>
            <div className="h-4 w-px bg-white/10"></div>
            <div className="flex items-center text-cyan-400">
                <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse mr-2"></div>
                Live System
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
