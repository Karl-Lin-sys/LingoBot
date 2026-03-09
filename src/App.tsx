import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mic, MicOff, Settings, Globe, Loader2, Volume2 } from 'lucide-react';
import { useLiveAPI } from './hooks/useLiveAPI';

const LANGUAGES = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese (Mandarin)' },
];

const PROFICIENCIES = [
  { value: 'Beginner', label: 'Beginner (A1-A2)' },
  { value: 'Intermediate', label: 'Intermediate (B1-B2)' },
  { value: 'Advanced', label: 'Advanced (C1-C2)' },
];

export default function App() {
  const [language, setLanguage] = useState(LANGUAGES[0].name);
  const [proficiency, setProficiency] = useState(PROFICIENCIES[0].value);
  const [showSettings, setShowSettings] = useState(true);
  
  const {
    isConnected,
    isConnecting,
    error,
    transcript,
    isModelSpeaking,
    connect,
    disconnect
  } = useLiveAPI();

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const handleToggleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect(language, proficiency);
      setShowSettings(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Globe className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">LingoBot</h1>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-full transition-colors"
          disabled={isConnected}
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 flex flex-col gap-6">
        
        {/* Settings Panel */}
        {showSettings && !isConnected && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200"
          >
            <h2 className="text-lg font-medium mb-4">Practice Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.name}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Proficiency</label>
                <select 
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  {PROFICIENCIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100 flex items-start gap-2">
            <div className="mt-0.5">⚠️</div>
            <div>{error}</div>
          </div>
        )}

        {/* Active Session Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] bg-white rounded-3xl shadow-sm border border-stone-200 p-8 relative overflow-hidden">
          
          {/* Visualizer / Avatar */}
          <div className="relative flex items-center justify-center w-48 h-48 mb-8">
            {isConnected ? (
              <>
                {/* Pulsing rings when speaking */}
                <motion.div 
                  animate={{ 
                    scale: isModelSpeaking ? [1, 1.2, 1] : 1,
                    opacity: isModelSpeaking ? [0.3, 0.1, 0.3] : 0.1
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className="absolute inset-0 bg-indigo-500 rounded-full"
                />
                <motion.div 
                  animate={{ 
                    scale: isModelSpeaking ? [1, 1.1, 1] : 1,
                    opacity: isModelSpeaking ? [0.5, 0.2, 0.5] : 0.2
                  }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut", delay: 0.2 }}
                  className="absolute inset-4 bg-indigo-500 rounded-full"
                />
                <div className="relative z-10 w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Volume2 className={`w-10 h-10 text-white ${isModelSpeaking ? 'animate-pulse' : ''}`} />
                </div>
              </>
            ) : (
              <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center border-2 border-dashed border-stone-300">
                <MicOff className="w-8 h-8 text-stone-400" />
              </div>
            )}
          </div>

          {/* Status Text */}
          <div className="text-center mb-8">
            <h3 className="text-xl font-medium text-stone-800">
              {isConnected ? `Practicing ${language}` : 'Ready to practice?'}
            </h3>
            <p className="text-stone-500 mt-1">
              {isConnecting ? 'Connecting to partner...' : 
               isConnected ? (isModelSpeaking ? 'Partner is speaking...' : 'Listening...') : 
               'Connect to start a conversation'}
            </p>
          </div>

          {/* Main Action Button */}
          <button
            onClick={handleToggleConnect}
            disabled={isConnecting}
            className={`
              flex items-center gap-2 px-8 py-4 rounded-full font-medium text-lg transition-all shadow-sm
              ${isConnecting ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 
                isConnected ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' : 
                'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'}
            `}
          >
            {isConnecting ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
            ) : isConnected ? (
              <><MicOff className="w-5 h-5" /> End Conversation</>
            ) : (
              <><Mic className="w-5 h-5" /> Start Conversation</>
            )}
          </button>
        </div>

        {/* Transcript Area */}
        {transcript.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-4">Conversation Transcript</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {transcript.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`
                      max-w-[80%] rounded-2xl px-4 py-3
                      ${entry.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-sm' 
                        : 'bg-stone-100 text-stone-800 rounded-tl-sm'}
                    `}
                  >
                    {entry.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
