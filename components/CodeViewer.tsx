
import React from 'react';
import { Terminal, Copy, Download, FileJson } from 'lucide-react';

interface CodeViewerProps {
  code?: string;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ code }) => {
  const displayCode = code || `
// Ask Gemini to build something...
// The code will appear here.

export const App = () => {
  return <div>Hello World</div>
};
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(displayCode);
    alert('Code copied to clipboard!');
  };

  return (
    <div className="h-full w-full flex flex-col bg-[#1e1e1e] overflow-hidden">
      <div className="h-10 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            <FileJson size={12} /> App.tsx
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
            styles.css
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-white transition-colors"
          >
            <Copy size={12} /> Copy
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-[10px] font-bold text-white transition-colors">
            <Download size={12} /> Export ZIP
          </button>
        </div>
      </div>
      <div className="flex-1 p-6 overflow-auto font-mono text-sm">
        <pre className="text-blue-300">
          <code>{displayCode}</code>
        </pre>
      </div>
      <div className="h-8 border-t border-white/10 bg-black flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2 text-green-500 text-[10px] font-bold">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          LIVE SYNC ACTIVE
        </div>
        <div className="text-white/30 text-[10px] font-bold">
          GEMINI ENGINE 3.0
        </div>
      </div>
    </div>
  );
};

export default CodeViewer;
