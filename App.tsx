import React, { useState } from 'react';
import Header from './components/Header';
import FeatureGrid from './components/FeatureGrid';
import Chatbot from './features/Chatbot';
import ImageStudio from './features/ImageStudio';
import VideoStudio from './features/VideoStudio';
import AudioStudio from './features/AudioStudio';
import Search from './features/Search';

const App: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const renderFeature = () => {
    switch (selectedFeature) {
      case 'chatbot':
        return <Chatbot />;
      case 'image_studio':
        return <ImageStudio />;
      case 'video_studio':
        return <VideoStudio />;
      case 'audio_studio':
        return <AudioStudio />;
      case 'search':
        return <Search />;
      default:
        return <FeatureGrid onSelectFeature={setSelectedFeature} />;
    }
  };

  const clearFeature = () => setSelectedFeature(null);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <Header onLogoClick={clearFeature} showBackArrow={!!selectedFeature} />
      <main className="flex-grow container mx-auto p-4 md:p-8 flex flex-col">
        <div className="animate-fade-in w-full h-full flex flex-col">
            {renderFeature()}
        </div>
      </main>
    </div>
  );
};

export default App;
