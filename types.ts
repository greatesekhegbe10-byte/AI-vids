
export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  STUDIO = 'STUDIO',
  ERROR = 'ERROR'
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface CreativeConcept {
  visualPrompt: string;
  slogan: string;
  voiceoverScript: string;
  scenes: { description: string; duration: string; textOverlay: string }[];
}

export interface ProductData {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
  targetAudience: string; 
  slogan: string;
  images: File[];
  aspectRatio: '16:9' | '9:16';
  voice: VoiceName;
  introText?: string;
  outroText?: string;
}

export interface GeneratedResult {
  videoUrl: string;
  audioUrl: string | null;
  videoOperation?: any; 
  concept?: CreativeConcept;
}

export interface BatchItem {
  id: string;
  data: ProductData;
  status: 'PENDING' | 'INITIATING' | 'QUOTA_WAIT' | 'POLLING' | 'COMPLETED' | 'FAILED';
  result?: GeneratedResult;
  concept?: CreativeConcept; // Textual plan available early
  error?: string;
  progress?: string;
  operationName?: string;
}
