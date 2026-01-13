
import React from 'react';
import { Role, Message } from '../types';
import { User, Sparkles, GraduationCap, AlertTriangle, Loader2, BrainCircuit } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const isLoading = !isUser && !message.text;
  
  return (
    <div className={`flex items-start gap-3 transition-all duration-300 ${isUser ? 'flex-row-reverse' : 'flex-row animate-in fade-in slide-in-from-left-2'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
        isUser 
          ? 'bg-gray-100 dark:bg-[#1e2022] border-gray-200 dark:border-studio-border text-gray-500' 
          : 'bg-blue-600 border-blue-500 text-white shadow-lg'
      }`}>
        {isUser ? <User size={16} /> : <Sparkles size={16} className={isLoading ? "animate-pulse" : ""} />}
      </div>
      
      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 px-1 mb-0.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{isUser ? 'User' : 'Assistant'}</span>
          {isLoading && (
            <span className="flex items-center gap-1 text-[8px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              <Loader2 size={10} className="animate-spin" /> Processing
            </span>
          )}
        </div>
        
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap border transition-all duration-300 ${
          isUser 
            ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-500 rounded-tr-none shadow-md' 
            : 'bg-white dark:bg-[#181a1c] border-gray-200 dark:border-studio-border text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
        }`}>
          {message.text || (
            <div className="flex gap-1.5 py-1.5 items-center justify-center">
              <span className="w-1.5 h-1.5 bg-blue-500/60 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-500/80 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatBubble;
