
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Role, Message, ChatConfig } from './types';
import ChatBubble from './components/ChatBubble';
import Sidebar from './components/Sidebar';
import CodeViewer from './components/CodeViewer';
import { 
  Send, Code, Eye, MousePointer2, Layout, Wand2, Globe, 
  Moon, Sun, PanelLeftClose, PanelLeftOpen, RotateCcw, 
  Monitor, Smartphone, Tablet, ExternalLink, Sparkles, X, 
  Palette, Type, Maximize2, Trash2, Edit3, AlignLeft, AlignCenter, AlignRight, Info, Hash, Droplet,
  Mic, MicOff, Paperclip, FileText, ImageIcon, TextCursor
} from 'lucide-react';

const STORAGE_KEY = 'gemini_studio_clone_history';

interface SelectedElement {
  tagName: string;
  classes: string;
  id: string;
  rect: DOMRect;
  path: string;
  styles: {
    fontFamily: string;
    lineHeight: string;
    fontSize: string;
    color: string;
    backgroundColor: string;
    textAlign: string;
  };
}

interface AttachedFile {
  name: string;
  type: string;
  data: string; // base64 or text content
  preview?: string;
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
  const [selectedEl, setSelectedEl] = useState<SelectedElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });
  
  const [config, setConfig] = useState<ChatConfig>({
    systemInstruction: "You are a senior web developer. When asked to build an app, provide the complete HTML code including Tailwind CSS classes. Use the structure: <html><head><script src='https://cdn.tailwindcss.com'></script></head><body>...</body></html>. Only provide the code in a single block.",
    temperature: 0.7,
    topP: 0.95,
    topK: 64,
    model: 'gemini-3-pro-preview'
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractCode = (text: string) => {
    const match = text.match(/```(?:tsx|jsx|html|xml|javascript|typescript|js|ts)?\s*([\s\S]*?)\s*```/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          const lastMsgWithCode = [...parsed].reverse().find(m => extractCode(m.text));
          if (lastMsgWithCode) setGeneratedCode(extractCode(lastMsgWithCode.text)!);
        }
      } catch (e) { console.error("History load error", e); }
    }

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
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      if (file.type.startsWith('image/')) {
        reader.onload = (event) => {
          const base64 = (event.target?.result as string).split(',')[1];
          setAttachments(prev => [...prev, { 
            name: file.name, 
            type: file.type, 
            data: base64, 
            preview: event.target?.result as string 
          }]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) recognitionRef.current.stop();
    else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (messages.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === 'dark') html.classList.add('dark');
    else html.classList.remove('dark');
  }, [theme]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleIframeClick = useCallback((e: MouseEvent) => {
    if (!isAnnotating || !iframeRef.current) return;
    const target = e.target as HTMLElement;
    if (!target || target === target.ownerDocument.body) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = target.getBoundingClientRect();
    const computed = window.getComputedStyle(target);
    setSelectedEl({
      tagName: target.tagName.toLowerCase(),
      classes: target.className,
      id: target.id,
      rect: rect,
      path: target.innerText.substring(0, 20) + (target.innerText.length > 20 ? '...' : ''),
      styles: {
        fontFamily: computed.fontFamily.split(',')[0].replace(/['"]/g, ''),
        lineHeight: computed.lineHeight,
        fontSize: computed.fontSize,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        textAlign: computed.textAlign
      }
    });
  }, [isAnnotating]);

  const applyDirectStyle = (styleProp: string, value: string) => {
    if (!selectedEl || !iframeRef.current) return;
    const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!iframeDoc) return;

    let selector = selectedEl.tagName;
    if (selectedEl.id) selector += `#${selectedEl.id}`;
    else if (selectedEl.classes) selector += `.${selectedEl.classes.split(' ').join('.')}`;

    const elements = iframeDoc.querySelectorAll(selector);
    elements.forEach((el: any) => {
      const rect = el.getBoundingClientRect();
      if (Math.abs(rect.top - selectedEl.rect.top) < 5) {
        el.style[styleProp] = value;
      }
    });

    setSelectedEl(prev => prev ? { ...prev, styles: { ...prev.styles, [styleProp]: value } } : null);
  };

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const setupIframeListeners = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        doc.addEventListener('click', handleIframeClick as any, true);
        doc.body.style.cursor = isAnnotating ? 'crosshair' : 'default';
      }
    };
    iframe.addEventListener('load', setupIframeListeners);
    setupIframeListeners();
    return () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) doc.removeEventListener('click', handleIframeClick as any, true);
    };
  }, [generatedCode, isAnnotating, handleIframeClick]);

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() && attachments.length === 0 || isLoading) return;

    if (isListening && recognitionRef.current) recognitionRef.current.stop();

    const userMsg: Message = { role: Role.USER, text: textToSend, id: Date.now().toString() };
    const modelId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentAttachments = [...attachments];
    setAttachments([]);
    setIsLoading(true);
    setSelectedEl(null);
    setIsAnnotating(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const parts: any[] = [{ text: textToSend }];
      
      currentAttachments.forEach(file => {
        if (file.type.startsWith('image/')) {
          parts.push({
            inlineData: { mimeType: file.type, data: file.data }
          });
        } else {
          parts[0].text += `\n\nAttached File [${file.name}]:\n${file.data}`;
        }
      });

      const response = await ai.models.generateContent({
        model: config.model,
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })), 
          { role: Role.USER, parts }
        ],
        config: { 
          systemInstruction: config.systemInstruction, 
          temperature: config.temperature,
          topP: config.topP,
          topK: config.topK
        }
      });

      const fullText = response.text || "";
      setMessages(prev => [...prev, { role: Role.MODEL, text: fullText, id: modelId }]);
      
      const usage = (response as any).usageMetadata;
      if (usage) {
        setTokenUsage(prev => ({
          prompt: prev.prompt + (usage.promptTokenCount || 0),
          completion: prev.completion + (usage.candidatesTokenCount || 0),
          total: prev.total + (usage.totalTokenCount || 0)
        }));
      }

      const code = extractCode(fullText);
      if (code) setGeneratedCode(code);

    } catch (error: any) {
      setMessages(prev => [...prev, { role: Role.MODEL, text: "Error connecting to Gemini. Check your API key.", id: modelId }]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFrameWidth = () => {
    if (deviceFrame === 'mobile') return 'w-[375px]';
    if (deviceFrame === 'tablet') return 'w-[768px]';
    return 'w-full';
  };

  const getIframeSrcDoc = () => {
    if (!generatedCode) return '';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { margin: 0; font-family: sans-serif; transition: all 0.2s ease; }
            * { transition: outline 0.1s ease; }
            ${isAnnotating ? '*:hover { outline: 2px solid #3b82f6 !important; outline-offset: -2px; cursor: crosshair !important; }' : ''}
            ::-webkit-scrollbar { width: 6px; }
            ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          </style>
        </head>
        <body class="bg-gray-50 h-screen">
          <div id="root">${generatedCode.includes('<html') ? generatedCode.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || generatedCode : generatedCode}</div>
        </body>
      </html>
    `;
  };

  return (
    <div className="flex h-screen w-full bg-white dark:bg-studio-dark text-gray-800 dark:text-gray-200 overflow-hidden font-sans transition-colors duration-300">
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-80' : 'w-0'} border-r border-gray-200 dark:border-studio-border overflow-hidden shrink-0`}>
        <Sidebar config={config} setConfig={setConfig} tokenUsage={tokenUsage} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-gray-200 dark:border-studio-border bg-white dark:bg-studio-dark flex items-center justify-between px-4 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-studio-input rounded-lg transition-colors">
              {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>
            <div className="h-4 w-[1px] bg-gray-300 dark:bg-studio-border mx-1" />
            <div className="flex bg-gray-100 dark:bg-[#1e2022] p-1 rounded-lg border border-gray-200 dark:border-studio-border">
              <button onClick={() => { setViewMode('preview'); setIsAnnotating(false); }} className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-[#2d2f31] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                <Eye size={14} /> Preview
              </button>
              <button onClick={() => { setViewMode('code'); setIsAnnotating(false); }} className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === 'code' ? 'bg-white dark:bg-[#2d2f31] shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>
                <Code size={14} /> Code
              </button>
            </div>
            <button 
              onClick={() => {
                if (viewMode !== 'preview') setViewMode('preview');
                setIsAnnotating(!isAnnotating);
                setSelectedEl(null);
              }} 
              className={`flex items-center gap-2 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${isAnnotating ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-studio-input'}`}
            >
              <MousePointer2 size={14} /> {isAnnotating ? 'Inspect Mode ON' : 'Annotate'}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-xs font-bold uppercase tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-900/20 transition-all">Deploy</button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-full md:w-[400px] border-r border-gray-200 dark:border-studio-border flex flex-col bg-white dark:bg-studio-dark relative shrink-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-24">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/10 rounded-2xl flex items-center justify-center text-blue-600"><Sparkles size={32} /></div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Start Building</h3>
                  <p className="text-xs">Describe your app idea and watch it come to life.</p>
                </div>
              ) : (
                <>
                  {messages.map(msg => <ChatBubble key={msg.id} message={msg} />)}
                  {isLoading && messages[messages.length - 1]?.role === Role.USER && <ChatBubble message={{ role: Role.MODEL, text: "", id: "loading" }} />}
                </>
              )}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-studio-dark via-white dark:via-studio-dark pt-10">
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-100 dark:bg-studio-input border border-gray-200 dark:border-studio-border rounded-lg pl-2 pr-1 py-1 text-[10px] font-bold">
                      {file.type.startsWith('image/') ? <ImageIcon size={12} className="text-blue-500" /> : <FileText size={12} className="text-purple-500" />}
                      <span className="max-w-[80px] truncate">{file.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-md transition-colors text-gray-500 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={selectedEl ? `Modify selected <${selectedEl.tagName}>...` : isListening ? "Listening..." : "Ask Gemini to build your app..."}
                  className={`w-full bg-gray-50 dark:bg-studio-input border ${selectedEl ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200 dark:border-studio-border'} text-sm rounded-xl py-3 pl-4 pr-28 outline-none transition-all resize-none shadow-sm placeholder-gray-400 dark:placeholder-gray-600`}
                  rows={2}
                />
                <div className="absolute right-2 bottom-2.5 flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    multiple 
                    accept="image/*,.txt,.js,.ts,.tsx,.html,.css,.json" 
                  />
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-studio-sidebar rounded-lg transition-all" title="Attach Files">
                    <Paperclip size={18} />
                  </button>
                  <button onClick={toggleListening} className={`p-2 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-studio-sidebar'}`} title={isListening ? "Stop Listening" : "Start Voice Input"}>
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  <button onClick={() => handleSend()} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg" disabled={(!input.trim() && attachments.length === 0) || isLoading}>
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 bg-gray-50 dark:bg-[#070809] flex-col overflow-hidden relative">
            {viewMode === 'preview' ? (
              <div className="flex-1 flex flex-col p-4 md:p-8 items-center overflow-hidden relative">
                <div className="mb-6 flex items-center gap-4 px-4 py-2 bg-white dark:bg-studio-sidebar rounded-full border border-gray-200 dark:border-studio-border shadow-sm">
                   <div className="flex items-center gap-1">
                     <button onClick={() => setDeviceFrame('desktop')} className={`p-1.5 rounded-md ${deviceFrame === 'desktop' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Monitor size={16} /></button>
                     <button onClick={() => setDeviceFrame('tablet')} className={`p-1.5 rounded-md ${deviceFrame === 'tablet' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Tablet size={16} /></button>
                     <button onClick={() => setDeviceFrame('mobile')} className={`p-1.5 rounded-md ${deviceFrame === 'mobile' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Smartphone size={16} /></button>
                   </div>
                   <div className="h-4 w-[1px] bg-gray-200 dark:bg-studio-border mx-1" />
                   <div className="text-[10px] font-mono text-gray-400 flex items-center gap-2">preview-app.local</div>
                   <button onClick={() => iframeRef.current?.contentWindow?.location.reload()} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"><RotateCcw size={16} /></button>
                </div>

                <div className={`flex-1 ${getFrameWidth()} bg-white rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.15)] border border-gray-200 dark:border-studio-border overflow-hidden transition-all duration-500 flex flex-col relative`}>
                   <div className="h-8 border-b bg-gray-50 flex items-center px-3 gap-1.5 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400/30" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/30" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400/30" />
                   </div>
                   
                   <iframe ref={iframeRef} srcDoc={getIframeSrcDoc()} className="w-full h-full border-none" title="Generated App Preview" sandbox="allow-scripts allow-same-origin" />

                   {selectedEl && (
                     <div className="absolute pointer-events-none z-50 animate-in fade-in zoom-in-95 duration-200" style={{ left: selectedEl.rect.left, top: selectedEl.rect.top, width: selectedEl.rect.width, height: selectedEl.rect.height, boxShadow: '0 0 0 2px #3b82f6, 0 0 0 6px rgba(59, 130, 246, 0.2)', borderRadius: '2px' }}>
                        <div className="absolute -top-12 left-0 bg-[#1e2022] text-white text-[10px] font-bold px-3 py-2 rounded-lg shadow-2xl border border-white/10 flex items-center gap-3 whitespace-nowrap pointer-events-auto ring-1 ring-black/20">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-400 font-mono tracking-tight">&lt;{selectedEl.tagName}&gt;</span>
                            <span className="font-mono text-gray-300 max-w-[150px] truncate">{selectedEl.id ? `#${selectedEl.id}` : (selectedEl.classes.split(' ')[0] ? `.${selectedEl.classes.split(' ')[0]}` : '')}</span>
                          </div>
                          <div className="h-3 w-[1px] bg-white/20" />
                          <button onClick={() => setSelectedEl(null)} className="hover:bg-white/10 rounded p-1 transition-colors text-white/70 hover:text-white"><X size={12} strokeWidth={3} /></button>
                        </div>

                        <div className="absolute -right-64 top-0 bg-white dark:bg-[#1c1e20] border border-gray-200 dark:border-studio-border rounded-xl shadow-[0_24px_48px_-12px_rgba(0,0,0,0.5)] p-4 w-60 pointer-events-auto flex flex-col gap-4 backdrop-blur-xl dark:bg-opacity-95 ring-1 ring-black/5 overflow-y-auto no-scrollbar max-h-[90vh]">
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2"><Hash size={12} className="text-blue-500" /> CSS Selector</label>
                            <div className="bg-gray-50 dark:bg-studio-input rounded-lg p-2 border border-gray-100 dark:border-studio-border overflow-hidden">
                               <p className="text-[10px] font-mono text-blue-600 dark:text-blue-400 truncate" title={selectedEl.classes}>{selectedEl.tagName}{selectedEl.id ? `#${selectedEl.id}` : ''}{selectedEl.classes ? `.${selectedEl.classes.split(' ').join('.')}` : ''}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2"><Info size={12} className="text-blue-500" /> Technical Details</label>
                            <div className="grid grid-cols-1 gap-2">
                              <div className="bg-gray-50 dark:bg-studio-input p-2 rounded-lg border border-gray-200 dark:border-studio-border flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-gray-400 uppercase">Font Family</span>
                                <span className="text-[10px] font-mono text-blue-500 truncate" title={selectedEl.styles.fontFamily}>{selectedEl.styles.fontFamily}</span>
                              </div>
                              <div className="bg-gray-50 dark:bg-studio-input p-2 rounded-lg border border-gray-200 dark:border-studio-border flex flex-col gap-1">
                                <span className="text-[8px] font-bold text-gray-400 uppercase">Line Height</span>
                                <span className="text-[10px] font-mono text-blue-500">{selectedEl.styles.lineHeight}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2"><AlignLeft size={12} className="text-cyan-500" /> Alignment</label>
                            <div className="flex bg-gray-100 dark:bg-studio-input p-1 rounded-lg border border-gray-200 dark:border-studio-border">
                              <button 
                                onClick={() => {
                                  applyDirectStyle('textAlign', 'left');
                                  handleSend(`Align the text of the selected <${selectedEl.tagName}> to the left.`);
                                }} 
                                className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${selectedEl.styles.textAlign === 'left' ? 'bg-white dark:bg-[#2d2f31] text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Align Left"
                              >
                                <AlignLeft size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  applyDirectStyle('textAlign', 'center');
                                  handleSend(`Align the text of the selected <${selectedEl.tagName}> to the center.`);
                                }} 
                                className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${selectedEl.styles.textAlign === 'center' ? 'bg-white dark:bg-[#2d2f31] text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Align Center"
                              >
                                <AlignCenter size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  applyDirectStyle('textAlign', 'right');
                                  handleSend(`Align the text of the selected <${selectedEl.tagName}> to the right.`);
                                }} 
                                className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${selectedEl.styles.textAlign === 'right' ? 'bg-white dark:bg-[#2d2f31] text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Align Right"
                              >
                                <AlignRight size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2"><Layout size={12} className="text-green-500" /> Responsive Toggle</label>
                            <div className="flex bg-gray-100 dark:bg-studio-input p-1 rounded-lg border border-gray-200 dark:border-studio-border">
                              <button onClick={() => setDeviceFrame('desktop')} className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${deviceFrame === 'desktop' ? 'bg-white dark:bg-[#2d2f31] text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Monitor size={14} /></button>
                              <button onClick={() => setDeviceFrame('tablet')} className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${deviceFrame === 'tablet' ? 'bg-white dark:bg-[#2d2f31] text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Tablet size={14} /></button>
                              <button onClick={() => setDeviceFrame('mobile')} className={`flex-1 py-1.5 rounded-md flex justify-center transition-all ${deviceFrame === 'mobile' ? 'bg-white dark:bg-[#2d2f31] text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><Smartphone size={14} /></button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2"><TextCursor size={12} className="text-orange-500" /> Font Size</label>
                            <div className="bg-gray-50 dark:bg-studio-input p-3 rounded-lg border border-gray-200 dark:border-studio-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">Size</span>
                                <div className="flex items-center gap-1">
                                  <input type="number" value={parseInt(selectedEl.styles.fontSize) || 16} onChange={(e) => applyDirectStyle('fontSize', e.target.value + 'px')} className="w-10 bg-transparent text-right text-[10px] font-mono text-blue-600 focus:outline-none" />
                                  <span className="text-[9px] text-gray-400">PX</span>
                                </div>
                              </div>
                              <input type="range" min="8" max="120" step="1" value={parseInt(selectedEl.styles.fontSize) || 16} onChange={(e) => applyDirectStyle('fontSize', e.target.value + 'px')} onMouseUp={() => handleSend(`Update the font size of the selected <${selectedEl.tagName}> to ${selectedEl.styles.fontSize} in the code.`)} className="w-full h-1 bg-gray-200 dark:bg-studio-border rounded-lg appearance-none cursor-pointer accent-blue-600" />
                            </div>
                          </div>

                          <div>
                            <label className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2 mb-2"><Palette size={12} className="text-purple-500" /> Quick Style</label>
                            <div className="space-y-1">
                              <button onClick={() => handleSend(`Change the background color of the selected <${selectedEl.tagName}> to a sophisticated, modern color.`)} className="w-full text-[11px] font-semibold flex items-center justify-between hover:bg-gray-100 dark:hover:bg-blue-900/20 p-2.5 rounded-lg transition-all group border border-transparent hover:border-blue-500/20"><div className="flex items-center gap-2"><Droplet size={14} className="text-blue-500" /><span className="group-hover:text-blue-500">Edit Background</span></div><div className="w-4 h-4 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 shadow-sm border border-white/20" /></button>
                              <button onClick={() => handleSend(`Change the text color of the selected <${selectedEl.tagName}> to something with high contrast.`)} className="w-full text-[11px] font-semibold flex items-center justify-between hover:bg-gray-100 dark:hover:bg-blue-900/20 p-2.5 rounded-lg transition-all group border border-transparent hover:border-blue-500/20"><div className="flex items-center gap-2"><Type size={14} className="text-gray-400 group-hover:text-blue-400" /><span className="group-hover:text-blue-500">Edit Text Color</span></div></button>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-gray-100 dark:border-studio-border">
                            <div className="flex gap-2">
                              <button onClick={() => handleSend(`Improve the content and aesthetics of this <${selectedEl.tagName}> element.`)} className="flex-1 bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-900/20"><Wand2 size={12} /> AI Remix</button>
                              <button onClick={() => handleSend(`Delete the selected <${selectedEl.tagName}> element.`)} className="w-10 bg-red-50 dark:bg-red-900/10 text-red-500 text-[10px] font-bold flex items-center justify-center py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors" title="Remove element"><Trash2 size={14} /></button>
                            </div>
                          </div>
                        </div>
                     </div>
                   )}
                </div>
              </div>
            ) : (
              <CodeViewer code={generatedCode} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
