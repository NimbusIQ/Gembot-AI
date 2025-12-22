import React from 'react';
import { LoadingIcon, ExclamationTriangleIcon, SparklesIcon } from './icons';

export const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean, icon?: React.ReactNode }> = ({
  children,
  isLoading = false,
  icon,
  ...props
}) => (
  <button
    {...props}
    disabled={isLoading || props.disabled}
    className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all"
  >
    {isLoading ? (
      <>
        <LoadingIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
        Generating...
      </>
    ) : (
      <>
        {icon}
        {children}
      </>
    )}
  </button>
);

export const PageTitle: React.FC<{ title: string, subtitle: string }> = ({ title, subtitle }) => (
    <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">{title}</h1>
        <p className="mt-1 text-gray-400">{subtitle}</p>
    </div>
);


export const LoadingState: React.FC<{ message: string, details?: string }> = ({ message, details }) => (
    <div className="flex flex-col items-center justify-center h-full bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-700 p-8">
      <LoadingIcon className="h-12 w-12 text-cyan-400 animate-spin mb-4" />
      <p className="text-lg font-semibold text-white">{message}</p>
      {details && <p className="text-gray-400 text-center">{details}</p>}
    </div>
);

export const ErrorState: React.FC<{ error: string }> = ({ error }) => (
    <div className="flex flex-col items-center justify-center h-full bg-red-900/20 rounded-xl border-2 border-dashed border-red-700 p-8 text-center">
      <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mb-4"/>
      <p className="text-lg font-semibold text-white">An Error Occurred</p>
      <p className="text-red-300 max-w-md">{error}</p>
    </div>
);


export const EmptyState: React.FC<{ title: string, message: string, icon: React.ReactNode }> = ({ title, message, icon }) => (
    <div className="flex flex-col items-center justify-center h-full bg-gray-800/30 rounded-xl border-2 border-dashed border-gray-700 p-8 text-center">
        {icon}
        <p className="text-lg font-semibold text-white mt-4">{title}</p>
        <p className="text-gray-400 max-w-md">{message}</p>
    </div>
);


export const Tab: React.FC<{ label: string, isActive: boolean, onClick: () => void }> = ({ label, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-cyan-600 text-white'
          : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
      }`}
    >
      {label}
    </button>
);

export const TabGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex items-center space-x-2 bg-gray-800/50 border border-gray-700 p-1 rounded-lg self-start mb-6">
        {children}
    </div>
);
