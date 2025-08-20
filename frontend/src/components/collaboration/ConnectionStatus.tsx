'use client';

import React from 'react';
import { useSocket } from '@/hooks/useSocket';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showText = true,
}) => {
  const { connectionStatus } = useSocket({ autoConnect: false });

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '●',
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500 animate-pulse',
          text: 'Connecting...',
          icon: '●',
        };
      case 'reconnecting':
        return {
          color: 'bg-orange-500 animate-pulse',
          text: 'Reconnecting...',
          icon: '●',
        };
      case 'disconnected':
      default:
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          icon: '●',
        };
    }
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${status.color}`}></div>
      {showText && (
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {status.text}
        </span>
      )}
    </div>
  );
};