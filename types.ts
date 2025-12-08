
export enum VoiceGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  CHILD = 'CHILD',
}

export enum SpeakingStyle {
  STANDARD = 'STANDARD',
  FICTION = 'FICTION',
  NON_FICTION = 'NON_FICTION',
  SINGING = 'SINGING',
}

export enum AppMode {
  VOICE_OVER = 'VOICE_OVER',
  VIDEO_TO_TEXT = 'VIDEO_TO_TEXT',
}

export interface VoiceOption {
  id: string;
  name: string;
  gender: VoiceGender;
  description: string;
  geminiVoiceName: string;
  recommendedPitch: number;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // Men
  { id: 'v1', name: 'Deep Narrator', gender: VoiceGender.MALE, description: 'Authoritative, deep', geminiVoiceName: 'Fenrir', recommendedPitch: -200 },
  { id: 'v2', name: 'Standard Man', gender: VoiceGender.MALE, description: 'Conversational, clear', geminiVoiceName: 'Puck', recommendedPitch: 0 },
  { id: 'v5', name: 'Energetic Man', gender: VoiceGender.MALE, description: 'Dynamic, lively', geminiVoiceName: 'Puck', recommendedPitch: 100 },
  
  // Women
  { id: 'v3', name: 'Soft Woman', gender: VoiceGender.FEMALE, description: 'Calm, soothing', geminiVoiceName: 'Kore', recommendedPitch: 0 },
  { id: 'v4', name: 'Energetic Woman', gender: VoiceGender.FEMALE, description: 'Bright, fast', geminiVoiceName: 'Zephyr', recommendedPitch: 0 },
  
  // Kids
  { id: 'v6', name: 'Energetic Boy', gender: VoiceGender.CHILD, description: 'Excited, high energy', geminiVoiceName: 'Puck', recommendedPitch: 450 },
  { id: 'v7', name: 'Standard Boy', gender: VoiceGender.CHILD, description: 'Casual, young', geminiVoiceName: 'Puck', recommendedPitch: 300 },
  { id: 'v8', name: 'Baby Girl', gender: VoiceGender.CHILD, description: 'Cute, toddler', geminiVoiceName: 'Kore', recommendedPitch: 600 },
];

export interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  buffer: AudioBuffer | null;
}
