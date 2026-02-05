export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface ProductData {
  name: string;
  description: string;
  images: File[];
  aspectRatio: '16:9' | '9:16';
}

export interface GeneratedVideo {
  uri: string;
  mimeType: string;
}
