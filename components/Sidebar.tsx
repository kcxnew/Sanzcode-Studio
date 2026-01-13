
import React, { useState } from 'react';
import { ChatConfig } from '../types';
import { 
  Sliders, Info, LayoutGrid, BookOpen, ChevronRight,
  Database, ShieldCheck, GraduationCap, Zap, Activity
} from 'lucide-react';

interface SidebarProps {
  config: ChatConfig;
  setConfig: React.Dispatch<React.SetStateAction<ChatConfig>>;
  tokenUsage: { prompt: number; completion: number; total: number };
}

const Sidebar: React.FC<SidebarProps> = ({ config, setConfig, tokenUsage }) => {
  const [activeTab, setActiveTab] = useState<'settings' | 'gallery'>('settings');
  const SESSION_LIMIT = 30000; // Arbitrary soft limit for visual representation

  const galleryItems = [
    { title: "Socratic Tutor", desc: "Uses LearnLM for active learning", type: "education", instruction: "Be a friendly, supportive tutor. Guide the student to meet their goals. Ask one question at a time to manage cognitive load." },
    { title: "Test Prep Buddy", desc: "Adaptive practice questions", type: "education", instruction: "You are a tutor helping prepare for a test. Generate practice questions. Start simple, then increase difficulty." },
    { title: "Dashboard UI", desc: "Enterprise metrics with charts", type: "build", instruction: "You are a senior frontend engineer. Help build React/Tailwind dashboards." },
    { title: "Mars Weather", desc: "Live IoT data visualization", type: "build", instruction: "You are an expert in data visualization and space science." }
  ];

  const applyBlueprint = (instruction: string) => {
    setConfig(prev => ({ ...prev, systemInstruction: instruction }));
    setActiveTab('settings');
  };

  const usagePercent = Math.min((tokenUsage.total / SESSION_LIMIT) * 100, 100);

  return (
    <aside className="w-full bg-gray-50 dark:bg-studio-sidebar border-gray-200 dark:border-studio-border flex flex-col h-full overflow-hidden shrink-0 transition-colors duration-300">
      <div className="p-2 flex bg-white dark:bg-studio-dark m-3 rounded-lg gap-1 border border-gray-200 dark:border-studio-border">
        <button onClick={() => setActiveTab('settings')} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'settings' ? 'bg-gray-100 dark:bg-[#2d2f31] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'}`}>Settings</button>
        <button onClick={() => setActiveTab('gallery')} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === 'gallery' ? 'bg-gray-100 dark:bg-[#2d2f31] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-400'}`}>Gallery</button>
      </div>

      {activeTab === 'settings' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-studio-border flex items-center justify-between">
            <h2 className="font-bold text-[11px] uppercase text-gray-500 tracking-widest">System Instruction</h2>
            {config.model.includes('learnlm') && (
              <span className="flex items-center gap-1 text-[9px] bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 px-1.5 py-0.5 rounded font-bold border border-purple-200 dark:border-purple-500/20"><GraduationCap size={10} /> LearnLM</span>
            )}
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-studio-border bg-white dark:bg-studio-dark">
            <textarea value={config.systemInstruction} onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })} className="w-full h-24 bg-gray-50 dark:bg-studio-input border border-gray-200 dark:border-studio-border rounded-lg p-3 text-xs resize-none text-gray-700 dark:text-gray-300 outline-none" placeholder="Guide the model's persona..." />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Token Usage Bar */}
            <div className="bg-white dark:bg-studio-dark border border-gray-200 dark:border-studio-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} className="text-blue-500" /> Session Tokens
                </h3>
                <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                  {tokenUsage.total.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 dark:bg-[#2a2c2e] rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-700 ease-out"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-bold uppercase text-gray-400">
                <div className="flex gap-2">
                  <span title="Input Tokens">IN: <span className="text-gray-600 dark:text-gray-300">{tokenUsage.prompt.toLocaleString()}</span></span>
                  <span title="Output Tokens">OUT: <span className="text-gray-600 dark:text-gray-300">{tokenUsage.completion.toLocaleString()}</span></span>
                </div>
                <span>30K SOFT LIMIT</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-500 mb-4 flex items-center gap-2 uppercase tracking-wide"><Sliders size={14} /> Model Config</h3>
              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-600 block mb-1.5 uppercase tracking-wider">Engine</label>
                  <select value={config.model} onChange={(e) => setConfig({ ...config, model: e.target.value })} className="w-full bg-white dark:bg-studio-input border border-gray-200 dark:border-studio-border rounded-lg px-3 py-2 text-xs outline-none">
                    <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                  </select>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Creativity</label>
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">{config.temperature.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0" max="1.5" step="0.1" value={config.temperature} onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })} className="w-full h-1.5 bg-gray-200 dark:bg-[#2a2c2e] rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-500/20 mb-4">
            <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2"><BookOpen size={14} /> App Gallery</h3>
            <p className="text-[10px] text-blue-700/70 dark:text-blue-500/70 mt-1 uppercase font-semibold">Select a blueprint to remix.</p>
          </div>
          <div className="space-y-3">
            {galleryItems.map((item, idx) => (
              <button key={idx} onClick={() => applyBlueprint(item.instruction)} className="w-full group text-left border border-gray-200 dark:border-studio-border rounded-xl p-3 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.title}</h4>
                <p className="text-[10px] text-gray-500 mt-1">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200 dark:border-studio-border bg-white dark:bg-studio-dark flex items-center gap-3 transition-colors">
         <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-blue-900/40">JD</div>
         <div className="flex-1 overflow-hidden">
           <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 truncate">John Developer</p>
           <p className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Tier: Pro Explorer</p>
         </div>
      </div>
    </aside>
  );
};

export default Sidebar;
