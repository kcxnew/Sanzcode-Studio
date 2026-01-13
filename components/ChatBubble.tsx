
import React from 'react';
import { Role, Message } from '../types';
import { User, Sparkles, GraduationCap, AlertTriangle, Loader2 } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const isLoading = !isUser && !message.text;
  
  const isLearnLMStyle = !isUser && message.text.toLowerCase().includes("reason") || message.text.toLowerCase().includes("step");
  const isBlocked = !isUser && message.text === "No Content";

  return (
    <div className={`flex items-start gap-3 transition-all duration-300 ${isUser ? 'flex-row-reverse' : 'flex-row animate-in fade-in slide-in-from-left-2'}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
        isUser 
          ? 'bg-gray-100 dark:bg-[#1e2022] border-gray-200 dark:border-studio-border text-gray-500 dark:text-gray-400' 
          : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20 dark:shadow-blue-900/20'
      }`}>
        {isUser ? <User size={16} /> : <Sparkles size={16} className={isLoading ? "animate-pulse" : ""} />}
      </div>
      
      <div className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 px-1 mb-0.5">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">
            {isUser ? 'User' : 'Assistant'}
          </span>
          {isLoading && (
            <span className="flex items-center gap-1 text-[8px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 transition-all animate-pulse">
              <Loader2 size={10} className="animate-spin" /> Thinking
            </span>
          )}
          {isLearnLMStyle && (
            <span className="flex items-center gap-1 text-[8px] text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-500/20 transition-colors">
              <GraduationCap size={10} /> Learning
            </span>
          )}
          {isBlocked && (
            <div className="group relative flex items-center gap-1 text-[8px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-500/20 cursor-help transition-colors">
              <AlertTriangle size={10} /> Safety Filter
              <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-white dark:bg-[#1a1c1e] text-gray-800 dark:text-gray-200 text-[10px] rounded-lg shadow-2xl border border-gray-200 dark:border-studio-border opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none">
                This response was flagged and blocked by safety filters.
              </div>
            </div>
          )}
        </div>
        
        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap border transition-all duration-300 ${
          isUser 
            ? 'bg-blue-600 dark:bg-blue-700 text-white border-blue-500 dark:border-blue-600 rounded-tr-none shadow-md' 
            : isBlocked 
              ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-500 italic rounded-tl-none font-medium'
              : 'bg-white dark:bg-[#181a1c] border-gray-200 dark:border-studio-border text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm min-w-[60px]'
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
