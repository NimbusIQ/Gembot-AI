
import React, { useRef, useState, useEffect } from 'react';
import { LoadingIcon, ExclamationTriangleIcon, MaterialSymbol } from './icons';

export const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean, variant?: 'primary' | 'secondary' | 'danger', icon?: React.ReactNode }> = ({
  children,
  isLoading = false,
  variant = 'primary',
  icon,
  ...props
}) => {
  const baseStyles = "relative flex items-center justify-center px-6 py-3.5 border text-sm font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group";
  
  const variants = {
    primary: "border-cyan-500/30 bg-cyan-600/10 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 shadow-cyan-900/20",
    secondary: "border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20",
    danger: "border-red-500/30 bg-red-600/10 text-red-400 hover:bg-red-500/20 hover:border-red-400 shadow-red-900/20"
  };

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`${baseStyles} ${variants[variant]} ${props.className || ''}`}
    >
      {isLoading ? (
        <div className="flex items-center">
          <LoadingIcon className="animate-spin -ml-1 mr-3 h-5 w-5" />
          <span className="animate-pulse">Processing...</span>
        </div>
      ) : (
        <>
          {icon && <span className="mr-2 opacity-70 group-hover:opacity-100 transition-opacity">{icon}</span>}
          {children}
        </>
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
    </button>
  );
};

export const PageTitle: React.FC<{ title: string, subtitle: string }> = ({ title, subtitle }) => (
    <div className="mb-10 animate-slide-in-bottom">
        <h1 className="text-4xl font-black text-white tracking-tighter">{title}</h1>
        <p className="mt-2 text-slate-400 font-medium">{subtitle}</p>
        <div className="h-1 w-12 bg-cyan-500 mt-4 rounded-full"></div>
    </div>
);

export const LoadingState: React.FC<{ message: string, details?: string }> = ({ message, details }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white/5 rounded-3xl border border-white/10 p-12 text-center animate-pulse">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full"></div>
        <LoadingIcon className="h-16 w-16 text-cyan-400 animate-spin relative z-10" />
      </div>
      <p className="text-xl font-bold text-white mb-2">{message}</p>
      {details && <p className="text-slate-500 text-sm max-w-sm mx-auto">{details}</p>}
    </div>
);

export const ErrorState: React.FC<{ error: string }> = ({ error }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-red-500/5 rounded-3xl border border-red-500/20 p-12 text-center animate-fade-in">
      <div className="p-4 bg-red-500/10 rounded-full mb-6">
        <ExclamationTriangleIcon className="h-10 w-10 text-red-500"/>
      </div>
      <p className="text-xl font-bold text-white mb-2">Protocol Error</p>
      <p className="text-red-400/80 max-w-md mx-auto text-sm leading-relaxed">{error}</p>
    </div>
);

export const EmptyState: React.FC<{ title: string, message: string, icon: React.ReactNode }> = ({ title, message, icon }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white/2 rounded-3xl border border-dashed border-white/10 p-12 text-center group transition-all duration-500 hover:bg-white/5">
        <div className="text-slate-600 transition-colors duration-500 group-hover:text-cyan-500/50">
          {icon}
        </div>
        <p className="text-xl font-bold text-white mt-6 mb-2">{title}</p>
        <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">{message}</p>
    </div>
);

export const Tab: React.FC<{ label: string, isActive: boolean, onClick: () => void, icon?: string }> = ({ label, isActive, onClick, icon }) => (
    <button
      onClick={onClick}
      className={`flex items-center px-5 py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 ${
        isActive
          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-300 border border-transparent'
      }`}
    >
      {icon && <MaterialSymbol icon={icon} className="mr-2" />}
      {label}
    </button>
);

export const TabGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 p-1.5 rounded-2xl self-start mb-10">
        {children}
    </div>
);

export const CameraCapture: React.FC<{ onCapture: (base64: string) => void }> = ({ onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsStreaming(true);
            }
        } catch (err) {
            setError("Failed to access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            setIsStreaming(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL('image/jpeg');
                onCapture(dataUrl.split(',')[1]);
                stopCamera();
            }
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    if (!isStreaming) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-white/5">
                <MaterialSymbol icon="photo_camera" className="text-4xl text-slate-600 mb-4" />
                <ActionButton variant="secondary" onClick={startCamera}>Initialize Camera</ActionButton>
                {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            </div>
        );
    }

    return (
        <div className="relative rounded-2xl overflow-hidden border border-cyan-500/30 bg-black group">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto aspect-video object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center space-x-4 translate-y-2 group-hover:translate-y-0 transition-transform">
                <ActionButton variant="primary" onClick={capturePhoto} icon={<MaterialSymbol icon="shutter_speed" />}>Capture Frame</ActionButton>
                <ActionButton variant="secondary" onClick={stopCamera} icon={<MaterialSymbol icon="close" />}>Cancel</ActionButton>
            </div>
        </div>
    );
};
