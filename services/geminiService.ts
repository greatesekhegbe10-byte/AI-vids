
import { GoogleGenAI, Type, Modality, VideoGenerationReferenceType, GenerateContentResponse } from "@google/genai";
import { GeneratedResult, VoiceName } from "../types";

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Enhanced retry wrapper with longer exponential backoff.
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 10, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isRetryable = 
      errorStr.includes('503') || 
      errorStr.includes('overloaded') || 
      errorStr.includes('unavailable') || 
      errorStr.includes('429') || 
      errorStr.includes('rate limit') ||
      errorStr.includes('504') ||
      errorStr.includes('deadline') ||
      errorStr.includes('internal error');

    if (retries > 0 && isRetryable) {
      console.warn(`Gemini API busy/overloaded. Waiting ${delay}ms before retry ${11-retries}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, Math.floor(delay * 1.5));
    }
    throw error;
  }
}

/**
 * Generates a WAV URL from raw PCM data.
 */
const createWavUrl = (base64PCM: string): string => {
  try {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const alignedLength = Math.floor(bytes.byteLength / 2) * 2;
    const int16Data = new Int16Array(bytes.buffer, 0, alignedLength / 2);
    
    const sampleRate = 24000;
    const numChannels = 1;
    const totalSize = 44 + int16Data.byteLength;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, int16Data.byteLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(int16Data.buffer));

    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
  } catch (e) {
    console.error("WAV creation failed:", e);
    return "";
  }
};

const enhancePromptWithSearch = async (
  name: string, 
  url: string, 
  description: string,
  targetAudience: string,
  introText?: string,
  outroText?: string
): Promise<{ visualPrompt: string; slogan: string; voiceoverScript: string }> => {
  const fallback = {
    visualPrompt: `High-end commercial for "${name}" targeting ${targetAudience}. ${introText ? `Start with: ${introText}.` : ''} Scene: Dynamic product close-ups with professional studio lighting. Atmosphere: Premium and detailed. Action: High-quality product demonstration for ${targetAudience}. ${outroText ? `End with: ${outroText}.` : ''} 4k resolution, cinematic quality.`,
    slogan: `${name.toUpperCase()}: FOR THE ${targetAudience.toUpperCase()}.`,
    voiceoverScript: `Discover the innovation behind ${name}. ${description}. Tailored for ${targetAudience}.`
  };

  try {
    const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });
    
    const prompt = `Task: Commercial Direction Specialist.
      Product: "${name}" ${url ? `(Website: ${url})` : ''}
      Details: "${description}"
      Target Audience: "${targetAudience}"
      Specifics: Intro(${introText || 'none'}), Outro(${outroText || 'none'})

      Use research to find brand tone. If URL provided, use it. 
      Tailor the visual style and script specifically to appeal to ${targetAudience}.
      Output strictly JSON:
      - visualPrompt: Detailed cinematic scene description for video generator (Veo).
      - slogan: Catchy 3-5 word slogan for this audience.
      - voiceoverScript: Engaging 15-second script.`;

    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: url ? [{ googleSearch: {} }] : [],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualPrompt: { type: Type.STRING },
            slogan: { type: Type.STRING },
            voiceoverScript: { type: Type.STRING }
          },
          required: ["visualPrompt", "slogan", "voiceoverScript"]
        }
      }
    })) as GenerateContentResponse;

    const text = response.text;
    if (!text) return fallback;
    
    try {
      return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (parseError) {
      return fallback;
    }
  } catch (error) {
    return fallback;
  }
};

const generateVoiceover = async (script: string, voiceName: VoiceName): Promise<string | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: (process.env.API_KEY || "").trim() });
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: script }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    })) as GenerateContentResponse;
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;
    return createWavUrl(base64Audio);
  } catch (e) {
    return null;
  }
};

export const extendVideo = async (
  originalVideo: any, 
  prompt: string, 
  aspectRatio: '16:9' | '9:16'
): Promise<GeneratedResult> => {
  const apiKey = (process.env.API_KEY || "").trim();
  const ai = new GoogleGenAI({ apiKey });

  let operation: any = await withRetry(() => ai.models.generateVideos({
    model: 'veo-3.1-generate-preview',
    prompt: `Smoothly extend the previous sequence: ${prompt}`,
    video: originalVideo,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio,
    }
  }));

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    const opAi = new GoogleGenAI({ apiKey });
    operation = await withRetry(() => opAi.operations.getVideosOperation({ operation: operation }));
  }

  const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!videoUri) throw new Error("Extension returned no data.");

  return {
    videoUrl: `${videoUri}&key=${apiKey}`,
    audioUrl: null, 
    videoOperation: operation.response?.generatedVideos?.[0]?.video
  };
};

export const generateVideoAd = async (
  name: string, 
  description: string, 
  images: File[], 
  aspectRatio: '16:9' | '9:16',
  websiteUrl: string,
  voice: VoiceName,
  introText?: string,
  outroText?: string,
  targetAudience: string = "general public"
): Promise<GeneratedResult> => {
  const apiKey = (process.env.API_KEY || "").trim();
  if (!apiKey) throw new Error("Please select an API key to begin.");

  const imageBase64 = await fileToBase64(images[0]);
  const imagePart = { imageBytes: imageBase64, mimeType: images[0].type };

  const creative = await enhancePromptWithSearch(
    name, websiteUrl, description, targetAudience, introText, outroText
  );

  const finalPrompt = `${creative.visualPrompt} Incorporate the brand name "${name}" and the audience theme of "${targetAudience}" into the visual aesthetics.`;

  const videoTask = (async () => {
    const ai = new GoogleGenAI({ apiKey });
    let operation: any = await withRetry(() => ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: finalPrompt,
      image: imagePart,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    }));

    let attempts = 0;
    while (!operation.done && attempts < 90) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      const pollAi = new GoogleGenAI({ apiKey });
      operation = await withRetry(() => pollAi.operations.getVideosOperation({ operation: operation }));
      attempts++;
    }

    if (operation.error) throw new Error(operation.error.message || "Video generation failed.");
    const video = operation.response?.generatedVideos?.[0]?.video;
    return { uri: `${video.uri}&key=${apiKey}`, raw: video };
  })();

  const audioTask = generateVoiceover(creative.voiceoverScript, voice);
  
  const [videoResult, audioUrl] = await Promise.all([videoTask, audioTask]);
  return {
    videoUrl: videoResult.uri,
    audioUrl,
    videoOperation: videoResult.raw
  };
};
