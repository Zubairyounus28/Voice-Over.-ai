
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
  PODCAST = 'PODCAST',
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
  isUrdu?: boolean;
  isCloned?: boolean;
  stylePrompt?: string;
}

export interface PodcastPair {
  id: string;
  name: string;
  description: string;
  speaker1: { name: string; voiceName: string; label: string };
  speaker2: { name: string; voiceName: string; label: string };
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // Men
  { id: 'v1', name: 'Deep Narrator', gender: VoiceGender.MALE, description: 'Authoritative, deep', geminiVoiceName: 'Fenrir', recommendedPitch: -200 },
  { id: 'principal_male', name: 'Principal (Male)', gender: VoiceGender.MALE, description: 'Authoritative, age 60', geminiVoiceName: 'Fenrir', recommendedPitch: -150 },
  { id: 'urdu_authority_male', name: 'Urdu Authority (Male)', gender: VoiceGender.MALE, description: 'Bold, Ad Style', geminiVoiceName: 'Fenrir', recommendedPitch: -100, isUrdu: true },
  { id: 'urdu_pro_emotional', name: 'Urdu Emotional (Pro)', gender: VoiceGender.MALE, description: 'Natural, Heartfelt, Professional', geminiVoiceName: 'Fenrir', recommendedPitch: -60, isUrdu: true },
  { id: 'v2', name: 'Standard Man', gender: VoiceGender.MALE, description: 'Conversational, clear', geminiVoiceName: 'Puck', recommendedPitch: 0 },
  { id: 'v5', name: 'Energetic Man', gender: VoiceGender.MALE, description: 'Dynamic, lively', geminiVoiceName: 'Puck', recommendedPitch: 100 },
  { id: 'urdu_1', name: 'Urdu Narrator', gender: VoiceGender.MALE, description: 'Pakistani Accent', geminiVoiceName: 'Puck', recommendedPitch: -50, isUrdu: true },
  
  // Women
  { id: 'principal_female', name: 'Principal (Female)', gender: VoiceGender.FEMALE, description: 'Strict, experienced', geminiVoiceName: 'Kore', recommendedPitch: -120 },
  { id: 'v3', name: 'Soft Woman', gender: VoiceGender.FEMALE, description: 'Calm, soothing', geminiVoiceName: 'Kore', recommendedPitch: 0 },
  { id: 'v4', name: 'Energetic Woman', gender: VoiceGender.FEMALE, description: 'Bright, fast', geminiVoiceName: 'Zephyr', recommendedPitch: 0 },
  
  // Kids
  { id: 'v6', name: 'Energetic Boy', gender: VoiceGender.CHILD, description: 'Excited, high energy', geminiVoiceName: 'Puck', recommendedPitch: 450 },
  { id: 'v7', name: 'Standard Boy', gender: VoiceGender.CHILD, description: 'Casual, young', geminiVoiceName: 'Puck', recommendedPitch: 300 },
  { id: 'v8', name: 'Baby Girl', gender: VoiceGender.CHILD, description: 'Cute, toddler', geminiVoiceName: 'Kore', recommendedPitch: 600 },
];

export const AVAILABLE_PODCAST_PAIRS: PodcastPair[] = [
  {
    id: 'pair_male_female',
    name: 'Male & Female',
    description: 'Classic host duo',
    speaker1: { name: 'Alex', voiceName: 'Fenrir', label: 'Male Host' },
    speaker2: { name: 'Sarah', voiceName: 'Kore', label: 'Female Host' }
  },
  {
    id: 'pair_male_male',
    name: 'Two Men',
    description: 'Deep & Standard voices',
    speaker1: { name: 'Alex', voiceName: 'Fenrir', label: 'Host 1 (Deep)' },
    speaker2: { name: 'Ben', voiceName: 'Puck', label: 'Host 2 (Clear)' }
  },
  {
    id: 'pair_female_female',
    name: 'Two Women',
    description: 'Soft & Energetic voices',
    speaker1: { name: 'Sarah', voiceName: 'Kore', label: 'Host 1 (Soft)' },
    speaker2: { name: 'Emily', voiceName: 'Zephyr', label: 'Host 2 (Lively)' }
  },
  {
    id: 'pair_male_boy',
    name: 'Father & Son',
    description: 'Man & Young Boy',
    speaker1: { name: 'Dad', voiceName: 'Fenrir', label: 'Father' },
    speaker2: { name: 'Timmy', voiceName: 'Puck', label: 'Son' }
  },
  {
    id: 'pair_female_girl',
    name: 'Mother & Daughter',
    description: 'Woman & Young Girl',
    speaker1: { name: 'Mom', voiceName: 'Kore', label: 'Mother' },
    speaker2: { name: 'Lily', voiceName: 'Zephyr', label: 'Daughter' }
  },
  {
    id: 'pair_father_daughter',
    name: 'Father & Daughter',
    description: 'Man & Young Girl',
    speaker1: { name: 'Dad', voiceName: 'Fenrir', label: 'Father' },
    speaker2: { name: 'Lily', voiceName: 'Zephyr', label: 'Daughter' }
  },
  {
    id: 'pair_mother_son',
    name: 'Mother & Son',
    description: 'Woman & Young Boy',
    speaker1: { name: 'Mom', voiceName: 'Kore', label: 'Mother' },
    speaker2: { name: 'Timmy', voiceName: 'Puck', label: 'Son' }
  }
];

export interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  buffer: AudioBuffer | null;
}
