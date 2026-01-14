
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration } from "@google/genai";
import { Role, Message, ChatConfig } from './types';
import ChatBubble from './components/ChatBubble';
import Sidebar from './components/Sidebar';
import CodeViewer from './components/CodeViewer';
import { 
  Send, Code, Eye, MousePointer2, Layout, Wand2, Globe, 
  Moon, Sun, PanelLeftClose, PanelLeftOpen, RotateCcw, 
  Monitor, Smartphone, Tablet, ExternalLink, Sparkles, X, 
  Palette, Type as TypeIcon, Maximize2, Trash2, Edit3, AlignLeft, AlignCenter, AlignRight, Info, Hash, Droplet,
  Mic, MicOff, Paperclip, FileText, ImageIcon, TextCursor, MoveVertical, BrainCircuit, Terminal, Search
} from 'lucide-react';

const STORAGE_KEY = 'gemini_studio_clone_history';

const extractCode = (text: string) => {
  const match = text.match(/```(?:html|jsx|tsx|javascript|typescript|xml)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : null;
};

const devToolsProtocol: FunctionDeclaration[] = [
  {
    name: 'browser_control',
    parameters: {
      type: Type.OBJECT,
      description: 'Control the browser preview environment',
      properties: {
        action: { type: Type.STRING, description: 'Action: scroll_to_top, scroll_to_bottom, reload' },
      },
      required: ['action'],
    },
  },
  {
    name: 'get_computed_styles',
    parameters: {
      type: Type.OBJECT,
      description: 'Get CSS computed styles for a specific element via selector',
      properties: {
        selector: { type: Type.STRING, description: 'CSS Selector (e.g. #root, .btn)' },
      },
      required: ['selector'],
    },
  },
  {
    name: 'inspect_hierarchy',
    parameters: {
      type: Type.OBJECT,
      description: 'Get the DOM structure of the current preview',
      properties: {},
    },
  }
];

interface AttachedFile {
  name: string;
  type: string;
  data: string; // base64 for images, raw text for docs
  preview?: string;
}

interface SelectedElement {
  tagName: string;
  id: string;
  classes: string;
  rect: DOMRect;
  styles: {
    fontSize: string;
    color: string;
    backgroundColor: string;
  };
}

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [deviceFrame, setDeviceFrame] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });
  const [consoleLogs, setConsoleLogs] = useState<{type: string, msg: string}[]>([]);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedEl, setSelectedEl] = useState<SelectedElement | null>(null);
  
  const [config, setConfig] = useState<ChatConfig>({
    systemInstruction: "You are a senior web developer with Chrome DevTools access. When building apps, provide HTML/Tailwind code. If images are provided, analyze them for UI/UX inspiration.",
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    model: 'gemini-3-pro-preview',
    isThinkingMode: false
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("Speech recognition not supported");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      // Fix: Use correct types for file upload event handlers
      if (file.type.startsWith('image/')) {
        reader.onload = (event: ProgressEvent<FileReader>) => {
          const result = event.target?.result as string;
          const base64 = result.split(',')[1];
          setAttachments(prev => [...prev, { 
            name: file.name, 
            type: file.type, 
            data: base64, 
            preview: result 
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event: ProgressEvent<FileReader>) => {
          setAttachments(prev => [...prev, { 
            name: file.name, 
            type: file.type, 
            data: event.target?.result as string 
          }]);
        };
        reader.readAsText(file);
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleToolCall = async (call: any) => {
    const iframe = iframeRef.current;
    if (!iframe) return { error: "Iframe not ready" };
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;

    switch (call.name) {
      case 'browser_control':
        if (call.args.action === 'scroll_to_bottom') win?.scrollTo({ top: doc?.body.scrollHeight, behavior: 'smooth' });
        if (call.args.action === 'scroll_to_top') win?.scrollTo({ top: 0, behavior: 'smooth' });
        if (call.args.action === 'reload') win?.location.reload();
        return { status: 'success', action: call.args.action };
      case 'get_computed_styles':
        const el = doc?.querySelector(call.args.selector);
        if (!el) return { error: 'Element not found' };
        const styles = window.getComputedStyle(el);
        return { selector: call.args.selector, fontSize: styles.fontSize, color: styles.color };
      case 'inspect_hierarchy':
        return { html: doc?.body.innerHTML.substring(0, 500) };
      default:
        return { error: 'Unknown tool' };
    }
  };

  // Fix: handleSend now accepts an optional text parameter for refinement logic
  const handleSend = async (overrideInput?: string) => {
    const currentInput = typeof overrideInput === 'string' ? overrideInput : input;
    if ((!currentInput.trim() && attachments.length === 0) || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMsg: Message = { role: Role.USER, text: currentInput, id: Date.now().toString() };
    setMessages(prev => [...prev, userMsg]);
    const currentAttachments = [...attachments];
    setAttachments([]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const activeModel = config.isThinkingMode ? 'gemini-3-pro-preview' : config.model;
      
      const parts: any[] = [{ text: currentInput }];
      currentAttachments.forEach(file => {
        if (file.type.startsWith('image/')) {
          parts.push({ inlineData: { mimeType: file.type, data: file.data } });
        } else {
          parts[0].text += `\n\n[File Content: ${file.name}]\n${file.data}`;
        }
      });

      const generationConfig: any = {
        systemInstruction: config.systemInstruction,
        temperature: config.temperature,
        tools: [{ functionDeclarations: devToolsProtocol }]
      };

      if (config.isThinkingMode) {
        generationConfig.thinkingConfig = { thinkingBudget: 32768 };
      }

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          { role: Role.USER, parts }
        ],
        config: generationConfig
      });

      let responseText = response.text || "";

      if (response.functionCalls) {
        for (const call of response.functionCalls) {
          const result = await handleToolCall(call);
          responseText += `\n\n*Tool Action: ${call.name} triggered.*`;
        }
      }

      setMessages(prev => [...prev, { role: Role.MODEL, text: responseText, id: Date.now().toString() }]);
      const code = extractCode(responseText);
      if (code) setGeneratedCode(code);

      const usage = (response as any).usageMetadata;
      if (usage) setTokenUsage(prev => ({ 
        prompt: prev.prompt + (usage.promptTokenCount || 0), 
        completion: prev.completion + (usage.candidatesTokenCount || 0), 
        total: prev.total + (usage.totalTokenCount || 0) 
      }));

    } catch (e: any) {
      setMessages(prev => [...prev, { role: Role.MODEL, text: `Error: ${e.message}`, id: Date.now().toString() }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Inspector logic
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'console') {
        setConsoleLogs(prev => [...prev.slice(-49), { type: e.data.level, msg: e.data.msg }]);
      }
      if (e.data.type === 'inspect') {
        setSelectedEl({
          tagName: e.data.tagName,
          id: e.data.id,
          classes: e.data.classes,
          rect: e.data.rect,
          styles: e.data.styles
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getDeviceWidth = () => {
    switch(deviceFrame) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="flex h-screen w-full bg-studio-dark text-gray-200 overflow-hidden font-sans">
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'w-80' : 'w-0'} border-r border-studio-border overflow-hidden shrink-0`}>
        <Sidebar config={config} setConfig={setConfig} tokenUsage={tokenUsage} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-studio-border bg-studio-dark flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-studio-input rounded-lg"><PanelLeftClose size={18} /></button>
            <div className="flex bg-studio-input p-1 rounded-lg border border-studio-border">
              <button onClick={() => setViewMode('preview')} className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase rounded-md ${viewMode === 'preview' ? 'bg-studio-border text-blue-400' : 'text-gray-500'}`}><Eye size={14} /> Preview</button>
              <button onClick={() => setViewMode('code')} className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase rounded-md ${viewMode === 'code' ? 'bg-studio-border text-blue-400' : 'text-gray-500'}`}><Code size={14} /> Code</button>
            </div>
            <button 
              onClick={() => {
                setIsAnnotating(!isAnnotating);
                if (isAnnotating) setSelectedEl(null);
              }} 
              className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase rounded-md transition-all ${isAnnotating ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-studio-input'}`}
            >
              <Search size={14} /> {isAnnotating ? 'Exit Annotate' : 'Annotate'}
            </button>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setConfig(prev => ({ ...prev, isThinkingMode: !prev.isThinkingMode }))} className={`p-2 rounded-lg transition-all ${config.isThinkingMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-studio-input'}`} title="Thinking Mode"><BrainCircuit size={18} /></button>
             <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-gray-500"><Sun size={18} /></button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-[400px] border-r border-studio-border flex flex-col bg-studio-dark relative">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar pb-32">
              {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
              {isLoading && <ChatBubble message={{ role: Role.MODEL, text: "", id: "loading" }} />}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-studio-dark border-t border-studio-border shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="group relative w-12 h-12 bg-studio-input rounded-lg border border-studio-border overflow-hidden">
                      {file.preview ? <img src={file.preview} className="w-full h-full object-cover opacity-60" /> : <FileText size={16} className="m-auto text-gray-500 h-full" />}
                      <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} 
                    placeholder={isListening ? "Listening..." : "Describe changes or ask..."} 
                    className={`w-full bg-studio-input border border-studio-border rounded-xl p-3 pr-10 outline-none text-sm resize-none transition-all ${isListening ? 'ring-2 ring-red-500/50' : ''}`} 
                    rows={2} 
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
                    <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:text-blue-400" title="Upload Files"><Paperclip size={18} /></button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                   <button onClick={toggleListening} className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-studio-input text-gray-500 hover:text-white'}`}><Mic size={18} /></button>
                   <button onClick={() => handleSend()} disabled={isLoading} className="p-2.5 bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50"><Send size={18} /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-[#070809] flex flex-col overflow-hidden relative">
            <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden items-center">
              <div 
                className="flex-1 bg-white rounded-xl shadow-2xl overflow-hidden relative transition-all duration-500"
                style={{ width: getDeviceWidth() }}
              >
                <iframe ref={iframeRef} srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <script src="https://cdn.tailwindcss.com"></script>
                      <script>
                        const originalLog = console.log;
                        console.log = (...args) => window.parent.postMessage({ type: 'console', level: 'log', msg: args.join(' ') }, '*');
                        console.error = (...args) => window.parent.postMessage({ type: 'console', level: 'error', msg: args.join(' ') }, '*');

                        // Inspector helper
                        document.addEventListener('mouseover', (e) => {
                          if (!window.__annotating) return;
                          e.target.style.outline = '2px solid #3b82f6';
                          e.target.style.outlineOffset = '-2px';
                        });
                        document.addEventListener('mouseout', (e) => {
                          if (!window.__annotating) return;
                          e.target.style.outline = '';
                        });
                        document.addEventListener('click', (e) => {
                          if (!window.__annotating) return;
                          e.preventDefault();
                          e.stopPropagation();
                          const styles = window.getComputedStyle(e.target);
                          window.parent.postMessage({
                            type: 'inspect',
                            tagName: e.target.tagName,
                            id: e.target.id,
                            classes: e.target.className,
                            rect: e.target.getBoundingClientRect(),
                            styles: {
                              fontSize: styles.fontSize,
                              color: styles.color,
                              backgroundColor: styles.backgroundColor
                            }
                          }, '*');
                        });
                        window.addEventListener('message', (e) => {
                          if (e.data.type === 'toggle-annotate') window.__annotating = e.data.active;
                        });
                      </script>
                      <style>
                        body { transition: all 0.3s ease; margin: 0; min-height: 100vh; cursor: default; }
                      </style>
                    </head>
                    <body><div id="root">${generatedCode}</div></body>
                  </html>
                `} 
                onLoad={() => iframeRef.current?.contentWindow?.postMessage({ type: 'toggle-annotate', active: isAnnotating }, '*')}
                className="w-full h-full border-none" 
                />

                {/* Annotation Tooltip */}
                {selectedEl && isAnnotating && (
                  <div 
                    className="absolute z-50 bg-studio-sidebar border border-studio-border rounded-xl shadow-2xl p-4 w-72 animate-in zoom-in-95 fade-in duration-200"
                    style={{ 
                      left: Math.min(selectedEl.rect.left + 20, window.innerWidth - 300), 
                      top: Math.min(selectedEl.rect.top + 20, window.innerHeight - 300) 
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                         <span className="text-[10px] font-black bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">&lt;{selectedEl.tagName.toLowerCase()}&gt;</span>
                         {selectedEl.id && <span className="text-[10px] text-gray-500 font-mono">#{selectedEl.id}</span>}
                      </div>
                      <button onClick={() => setSelectedEl(null)} className="text-gray-500 hover:text-white"><X size={14} /></button>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-studio-input p-2 rounded-lg border border-studio-border">
                        <label className="text-[9px] font-bold text-gray-500 uppercase block mb-1">Responsive Preview</label>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setDeviceFrame('desktop')} 
                            className={`flex-1 p-2 rounded flex flex-col items-center gap-1 transition-all ${deviceFrame === 'desktop' ? 'bg-blue-600/20 text-blue-400' : 'bg-studio-sidebar text-gray-600'}`}
                          >
                            <Monitor size={16} />
                            <span className="text-[8px] font-bold">DESK</span>
                          </button>
                          <button 
                            onClick={() => setDeviceFrame('tablet')} 
                            className={`flex-1 p-2 rounded flex flex-col items-center gap-1 transition-all ${deviceFrame === 'tablet' ? 'bg-blue-600/20 text-blue-400' : 'bg-studio-sidebar text-gray-600'}`}
                          >
                            <Tablet size={16} />
                            <span className="text-[8px] font-bold">TAB</span>
                          </button>
                          <button 
                            onClick={() => setDeviceFrame('mobile')} 
                            className={`flex-1 p-2 rounded flex flex-col items-center gap-1 transition-all ${deviceFrame === 'mobile' ? 'bg-blue-600/20 text-blue-400' : 'bg-studio-sidebar text-gray-600'}`}
                          >
                            <Smartphone size={16} />
                            <span className="text-[8px] font-bold">MOB</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-studio-input p-2 rounded-lg border border-studio-border">
                           <label className="text-[8px] font-bold text-gray-600 uppercase block">Font Size</label>
                           <span className="text-[10px] font-mono text-gray-300">{selectedEl.styles.fontSize}</span>
                        </div>
                        <div className="bg-studio-input p-2 rounded-lg border border-studio-border">
                           <label className="text-[8px] font-bold text-gray-600 uppercase block">Color</label>
                           <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full border border-white/20" style={{ backgroundColor: selectedEl.styles.color }} />
                              <span className="text-[9px] font-mono text-gray-300 truncate">{selectedEl.styles.color}</span>
                           </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          handleSend(`Inspect this <${selectedEl.tagName.toLowerCase()}> element with classes "${selectedEl.classes}". It currently has font size ${selectedEl.styles.fontSize}. Make it look more premium.`);
                          setSelectedEl(null);
                          setIsAnnotating(false);
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Wand2 size={12} /> Refine with AI
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="h-40 w-full bg-studio-sidebar border border-studio-border rounded-xl flex flex-col overflow-hidden">
                <div className="h-8 border-b border-studio-border bg-studio-input flex items-center px-3 justify-between">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest"><Terminal size={12} /> Console</div>
                  <button onClick={() => setConsoleLogs([])} className="text-[9px] hover:text-white uppercase">Clear</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] space-y-1">
                  {consoleLogs.map((log, i) => (
                    <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                      <span className="opacity-30">[{i}]</span>
                      <span>{log.msg}</span>
                    </div>
                  ))}
                  {consoleLogs.length === 0 && <div className="text-gray-600 italic">No logs...</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
