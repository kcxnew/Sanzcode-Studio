
import React, { useState } from 'react';
import { ChatConfig } from '../types';
import { 
  Sliders, Info, LayoutGrid, BookOpen, ChevronRight,
  Database, ShieldCheck, GraduationCap, Zap, Activity, AlertCircle, BrainCircuit, Terminal, Shield
} from 'lucide-react';

interface SidebarProps {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  tokenUsage: { prompt: number; completion: number; total: number };
}

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig, tokenUsage }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'mcp'>('settings');
  const SESSION_LIMIT = 50000; 
  const usagePercent = Math.min((tokenUsage.total / SESSION_LIMIT) * 100, 100);

  return (
    <aside className="w-full bg-studio-sidebar border-studio-border flex flex-col h-full overflow-hidden shrink-0">
      <div className="p-2 flex bg-studio-dark m-3 rounded-lg gap-1 border border-studio-border">
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'settings' ? 'bg-studio-border text-blue-400' : 'text-gray-500'}`}>Engine</button>
        <button onClick={() => setActiveTab('mcp')} className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'mcp' ? 'bg-studio-border text-blue-400' : 'text-gray-500'}`}>MCP Tools</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
        {activeTab === 'settings' ? (
          <>
            <div className="bg-studio-dark border border-studio-border rounded-xl p-4">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-3"><Activity size={14} /> Consumption</h3>
              <div className="w-full h-1.5 bg-studio-input rounded-full overflow-hidden mb-2">
                <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${usagePercent}%` }} />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-gray-600">
                <span>{tokenUsage.total.toLocaleString()} TOKENS</span>
                <span>{usagePercent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-studio-input border border-studio-border rounded-xl">
                  <div className="flex items-center gap-2">
                    <BrainCircuit size={16} className={config.isThinkingMode ? "text-indigo-400" : "text-gray-600"} />
                    <span className="text-xs font-bold text-gray-300">Thinking Mode</span>
                  </div>
                  <button onClick={() => setConfig(prev => ({ ...prev, isThinkingMode: !prev.isThinkingMode }))} className={`w-8 h-4 rounded-full relative transition-colors ${config.isThinkingMode ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${config.isThinkingMode ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
               </div>

               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Model Node</label>
                 <select value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="w-full bg-studio-input border border-studio-border rounded-xl p-3 text-xs font-semibold text-gray-300 outline-none">
                   <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                   <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                   <option value="gemini-2.5-flash-lite-latest">Gemini 2.5 Flash Lite</option>
                 </select>
               </div>
            </div>
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-indigo-400" />
                <h4 className="text-xs font-bold text-indigo-400 uppercase">MCP Protocol Active</h4>
              </div>
              <p className="text-[10px] text-indigo-300/70 leading-relaxed">The model is granted direct access to Browser Control and DevTools capabilities.</p>
            </div>

            <div className="space-y-2">
               {[
                 { name: 'browser_control', desc: 'Viewport & Scroll management' },
                 { name: 'get_computed_styles', desc: 'Deep CSS inspection' },
                 { name: 'inspect_hierarchy', desc: 'DOM element discovery' }
               ].map(tool => (
                 <div key={tool.name} className="p-3 bg-studio-input border border-studio-border rounded-xl group hover:border-blue-500/50 transition-colors">
                   <div className="flex items-center gap-2 mb-1">
                     <Terminal size={12} className="text-blue-500" />
                     <span className="text-[11px] font-mono font-bold text-gray-300">{tool.name}</span>
                   </div>
                   <p className="text-[9px] text-gray-500 font-medium tracking-tight">{tool.desc}</p>
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-studio-border bg-studio-dark/50">
        <div className="flex items-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-widest">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
          Gateway Connected
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
