import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AudioRecorder, AudioPlayer } from '../utils/audio';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type TranscriptEntry = {
  id: string;
  role: 'user' | 'model';
  text: string;
};

export function useLiveAPI() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(async (language: string, proficiency: string) => {
    setIsConnecting(true);
    setError(null);
    setTranscript([]);

    try {
      audioPlayerRef.current = new AudioPlayer();
      audioPlayerRef.current.init();

      const systemInstruction = `You are a helpful and encouraging language learning partner. 
The user is learning ${language} at a ${proficiency} level. 
Speak ONLY in ${language}. 
Keep your responses relatively short, conversational, and appropriate for their proficiency level. 
If they make a mistake, gently correct them in ${language}. 
Start the conversation by greeting them and asking how they are doing today.`;

      const sessionPromise = ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction,
          // Enable transcriptions
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            
            audioRecorderRef.current = new AudioRecorder((base64Data) => {
              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            });
            audioRecorderRef.current.start();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioPlayerRef.current) {
              audioPlayerRef.current.playBase64Pcm(base64Audio);
              
              setIsModelSpeaking(true);
              if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
              speakingTimeoutRef.current = setTimeout(() => {
                setIsModelSpeaking(false);
              }, 1000);
            }

            // Handle interruption
            if (message.serverContent?.interrupted && audioPlayerRef.current) {
              audioPlayerRef.current.clearQueue();
              setIsModelSpeaking(false);
            }

            // Handle transcriptions
            // Model transcription
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              const textParts = parts.filter(p => p.text).map(p => p.text).join('');
              if (textParts) {
                setTranscript(prev => {
                  // If the last entry is from the model, append to it, otherwise create a new one
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'model') {
                    const newPrev = [...prev];
                    newPrev[newPrev.length - 1] = { ...last, text: last.text + textParts };
                    return newPrev;
                  }
                  return [...prev, { id: Date.now().toString() + Math.random(), role: 'model', text: textParts }];
                });
              }
            }
            
            // User transcription (might be in turnComplete or elsewhere, we'll try to catch it if it comes as text)
            // The exact structure for inputAudioTranscription is not fully documented in the prompt, 
            // but we'll check if there's any clientContent or similar if possible.
            // For now, we rely on the model's responses.
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError(err.message || "An error occurred");
            disconnect();
          },
          onclose: () => {
            disconnect();
          }
        }
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to connect to the Live API");
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {}
      sessionRef.current = null;
    }
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.stop();
      audioPlayerRef.current = null;
    }
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
    setIsConnected(false);
    setIsConnecting(false);
    setIsModelSpeaking(false);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    transcript,
    isModelSpeaking,
    connect,
    disconnect
  };
}
