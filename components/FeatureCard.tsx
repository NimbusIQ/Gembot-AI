import React from 'react';
import { MaterialSymbol } from './icons';

interface FeatureCardProps {
  id: string;
  title: string;
  description: string;
  icon: string;
  onSelect: (id: string) => void;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ id, title, description, icon, onSelect }) => {
  return (
    <div
      onClick={() => onSelect(id)}
      className="group relative p-6 bg-gray-800 rounded-xl border border-gray-700/50 cursor-pointer transition-all duration-300 ease-in-out hover:border-cyan-500/50 hover:-translate-y-1 overflow-hidden feature-card-bg-gradient"
    >
        <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 feature-card-hover-gradient"></div>
        <div className="relative z-10">
            <div className="mb-4 text-cyan-400 text-3xl">
                <MaterialSymbol icon={icon} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
        </div>
    </div>
  );
};

export default FeatureCard;
