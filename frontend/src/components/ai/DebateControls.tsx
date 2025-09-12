'use client';

import React from 'react';

interface DebateControlsProps {
  status: 'active' | 'concluded' | 'abandoned';
  onConclude: () => void;
  onAbandon: () => void;
}

const DebateControls: React.FC<DebateControlsProps> = ({
  status,
  onConclude,
  onAbandon
}) => {
  if (status === 'concluded') {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">✅</span>
            <span className="text-green-800 font-medium">Debate Concluded</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            This debate has been concluded. Review the arguments and conclusion above.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'abandoned') {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-gray-600 mr-2">⏸️</span>
            <span className="text-gray-800 font-medium">Debate Abandoned</span>
          </div>
          <p className="text-gray-700 text-sm mt-1">
            This debate has been abandoned. You can start a new debate if needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          <p>Continue the discussion or conclude the debate when ready.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onAbandon}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Abandon Debate
          </button>
          <button
            onClick={onConclude}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Conclude Debate
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebateControls;
