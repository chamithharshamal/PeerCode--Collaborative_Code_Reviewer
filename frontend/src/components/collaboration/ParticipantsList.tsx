'use client';

import React from 'react';
import { useCollaborationContext } from './CollaborationProvider';
import { User } from '@/types';

interface ParticipantsListProps {
  className?: string;
}

const ParticipantAvatar: React.FC<{ user: User; isTyping: boolean }> = ({ user, isTyping }) => {
  return (
    <div className={`relative flex items-center space-x-2 ${isTyping ? 'animate-pulse' : ''}`}>
      <div className="relative">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {user.username.charAt(0).toUpperCase()}
        </div>
        {isTyping && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white">
            <div className="w-full h-full bg-green-500 rounded-full animate-ping"></div>
          </div>
        )}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {user.username}
        {isTyping && <span className="text-green-500 ml-1">typing...</span>}
      </span>
    </div>
  );
};

export const ParticipantsList: React.FC<ParticipantsListProps> = ({ className = '' }) => {
  const { participants, typingUsers, isConnected } = useCollaborationContext();

  if (!isConnected) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span className="text-sm">Connecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Participants ({participants.length})
        </h3>
      </div>
      
      <div className="space-y-2">
        {participants.map((participant) => (
          <ParticipantAvatar
            key={participant.id}
            user={participant}
            isTyping={typingUsers.has(participant.id)}
          />
        ))}
      </div>

      {typingUsers.size > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
            <div className="flex space-x-1">
              <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <span>
              {typingUsers.size === 1 ? 'Someone is typing' : `${typingUsers.size} people are typing`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};