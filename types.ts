export enum AppState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  STUDIO = 'STUDIO',
  ERROR = 'ERROR'
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface ProductData {
  id: string; // Unique ID for batching
  name: string;
  websiteUrl: string;
  description: string;
  images: File[];
  aspectRatio: '16:9' | '9:16';
  voice: VoiceName;
  introText?: string;
  outroText?: string;
}

export interface GeneratedResult {
  videoUrl: string;
  audioUrl: string | null;
  videoOperation?: any; // To allow extension
}

export interface BatchItem {
  id: string;
  data: ProductData;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  result?: GeneratedResult;
  error?: string;
  progress?: string;
}
