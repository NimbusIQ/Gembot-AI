import React from 'react';
import FeatureCard from './FeatureCard';

interface FeatureGridProps {
  onSelectFeature: (id: string) => void;
}

const features = {
  text: [
    { id: 'chatbot', title: 'AI Chatbot', icon: 'voice_chat', description: 'Engage in conversations, ask complex questions, and get fast responses from a suite of Gemini models.' },
    { id: 'search', title: 'Grounded Search', icon: 'travel_explore', description: 'Get up-to-date, real-world information grounded in Google Search and Maps data.' },
  ],
  media: [
    { id: 'image_studio', title: 'Image Studio', icon: 'photo_camera', description: 'Generate, edit, and analyze images with powerful models like Imagen and Gemini.' },
    { id: 'video_studio', title: 'Video Studio', icon: 'movie', description: 'Create stunning videos from text or images and analyze video content using Veo.' },
    { id: 'audio_studio', title: 'Audio Studio', icon: 'graphic_eq', description: 'Experience real-time voice conversations, transcribe audio, and generate speech with TTS.' },
  ],
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div>
        <h2 className="text-2xl font-bold text-cyan-400/80 mb-6 tracking-wide">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children}
        </div>
    </div>
);


const FeatureGrid: React.FC<FeatureGridProps> = ({ onSelectFeature }) => {
  return (
    <div className="space-y-12">
        <div className="text-center animate-slide-in-bottom">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">Welcome to Nimbus iQ</h1>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">Your unified platform for cutting-edge generative AI. Select a tool to begin.</p>
        </div>

        <div className="space-y-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Section title="Text & Logic">
                {features.text.map(feature => <FeatureCard key={feature.id} {...feature} onSelect={onSelectFeature} />)}
            </Section>
            
            <Section title="Multimedia">
                {features.media.map(feature => <FeatureCard key={feature.id} {...feature} onSelect={onSelectFeature} />)}
            </Section>
        </div>
    </div>
  );
};

export default FeatureGrid;