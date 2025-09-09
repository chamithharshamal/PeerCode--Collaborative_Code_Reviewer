'use client';

import React, { useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

interface EnhancedConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  onReconnect?: () => void;
}

export const EnhancedConnectionStatus: React.FC<EnhancedConnectionStatusProps> = ({
  className = '',
  showDetails = false,
  onReconnect,
}) => {
  const { connectionStatus, connectionStats, connect, disconnect } = useSocket({ autoConnect: false });
  const [showStats, setShowStats] = useState(false);

  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          color: 'bg-green-500',
          text: 'Connected',
          icon: '●',
          description: 'Real-time collaboration active',
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500 animate-pulse',
          text: 'Connecting...',
          icon: '●',
          description: 'Establishing connection',
        };
      case 'reconnecting':
        return {
          color: 'bg-orange-500 animate-pulse',
          text: 'Reconnecting...',
          icon: '●',
          description: `Attempt ${connectionStats.reconnectAttempts}`,
        };
      case 'disconnected':
      default:
        return {
          color: 'bg-red-500',
          text: 'Disconnected',
          icon: '●',
          description: connectionStats.lastError || 'No connection',
        };
    }
  };

  const formatDuration = (date: Date | null): string => {
    if (!date) return 'N/A';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatLatency = (latency: number | null): string => {
    if (latency === null) return 'N/A';
    return `${latency}ms`;
  };

  const status = getStatusInfo();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {status.text}
        </span>
      </div>

      {showDetails && (
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {status.description}
          </span>
          
          {connectionStatus === 'connected' && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                Latency: {formatLatency(connectionStats.latency)}
              </span>
              <span className="text-xs text-gray-500">
                Duration: {formatDuration(connectionStats.connectionTime)}
              </span>
            </div>
          )}

          <button
            onClick={() => setShowStats(!showStats)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            {showStats ? 'Hide' : 'Show'} Stats
          </button>
        </div>
      )}

      {showStats && (
        <div className="absolute top-8 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-10 min-w-64">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Connection Statistics
          </h4>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">{status.text}</span>
            </div>
            <div className="flex justify-between">
              <span>Connected:</span>
              <span>{connectionStats.connectionTime ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{formatDuration(connectionStats.connectionTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>Latency:</span>
              <span>{formatLatency(connectionStats.latency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Reconnect Attempts:</span>
              <span>{connectionStats.reconnectAttempts}</span>
            </div>
            {connectionStats.lastError && (
              <div className="flex justify-between">
                <span>Last Error:</span>
                <span className="text-red-600 text-xs max-w-32 truncate" title={connectionStats.lastError}>
                  {connectionStats.lastError}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex space-x-2">
              {connectionStatus === 'disconnected' && (
                <button
                  onClick={() => {
                    connect();
                    onReconnect?.();
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reconnect
                </button>
              )}
              {connectionStatus === 'connected' && (
                <button
                  onClick={disconnect}
                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
