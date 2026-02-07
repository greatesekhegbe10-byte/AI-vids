
export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export interface AdScene {
  scene_id: string;
  scene_goal: 'hook' | 'educate' | 'persuade' | 'convert';
  duration_seconds: number;
  scene_title: string;
  voiceover_text: string;
  on_screen_text: string;
  visual_instruction: string;
}

export interface AdPlan {
  scene_map: AdScene[];
  audio_strategy: {
    voice_style: string;
    music_suggestion: string;
  };
  cta_block: {
    primary: string;
    urgency: string;
    variants: string[];
  };
  derivatives: {
    teaser_15s: string[];
    ad_30s: string[];
    ad_60s: string[];
  };
}

export interface ProductData {
  id: string;
  name: string;
  websiteUrl: string;
  description: string;
  targetAudience: string; 
  slogan: string;
  goal: 'SALES' | 'SIGNUPS' | 'AWARENESS' | 'RETARGETING';
  tone: 'LUXURY' | 'ENERGETIC' | 'TECHY' | 'PROFESSIONAL' | 'FUN';
  platform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'WEBSITE';
  maxDuration: number;
  images: File[];
  aspectRatio: '16:9' | '9:16';
  voice: VoiceName;
}

export interface GeneratedResult {
  videoUrl: string;
  audioUrl: string | null;
  videoOperation?: any; 
  plan?: AdPlan;
}

export interface BatchItem {
  id: string;
  data: ProductData;
  status: 'PENDING' | 'INITIATING' | 'QUOTA_WAIT' | 'POLLING' | 'COMPLETED' | 'FAILED';
  result?: GeneratedResult;
  plan?: AdPlan;
  error?: string;
  operationName?: string;
}
