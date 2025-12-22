import React from 'react';

interface HeaderProps {
  onLogoClick: () => void;
  showBackArrow: boolean;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, showBackArrow }) => {
  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-20">
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-center">
        <div 
            onClick={onLogoClick} 
            className="flex items-center cursor-pointer group"
            aria-label="Back to home"
        >
            {showBackArrow && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-400 group-hover:text-cyan-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            )}
            <img src="https://storage.googleapis.com/aistudio-ux-team-data/demos/nimbus-logo.png" alt="Nimbus IQ AI Logo" className="h-12 w-12 mr-4" />
            <div>
            <h1 className="text-xl font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">NIMBUS iQ AI</h1>
            <p className="text-sm text-gray-400">AI Generation Platform</p>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
