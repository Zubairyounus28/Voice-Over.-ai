
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
  STORY = 'STORY',
  SOLO_STORY = 'SOLO_STORY',
}

export enum AppMode {
  VOICE_OVER = 'VOICE_OVER',
  VIDEO_TO_TEXT = 'VIDEO_TO_TEXT',
  VIDEO_ENHANCER = 'VIDEO_ENHANCER',
  SCRIPT_TO_VIDEO = 'SCRIPT_TO_VIDEO',
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
  age?: string;
  accent?: string;
  language?: string;
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
  { id: 'v_father_solo', name: 'Storyteller Father', gender: VoiceGender.MALE, description: 'Protective, warm, calm', geminiVoiceName: 'Fenrir', recommendedPitch: -100 },
  { id: 'v1', name: 'Deep Narrator', gender: VoiceGender.MALE, description: 'Authoritative, deep', geminiVoiceName: 'Fenrir', recommendedPitch: -200 },
  { id: 'v2', name: 'Standard Man', gender: VoiceGender.MALE, description: 'Conversational, clear', geminiVoiceName: 'Puck', recommendedPitch: 0 },
  { id: 'v5', name: 'Energetic Man', gender: VoiceGender.MALE, description: 'Dynamic, lively', geminiVoiceName: 'Puck', recommendedPitch: 100 },
  { id: 'urdu_authority_male', name: 'Urdu Authority (Male)', gender: VoiceGender.MALE, description: 'Bold, Ad Style', geminiVoiceName: 'Fenrir', recommendedPitch: -100, isUrdu: true },
  { id: 'urdu_wise_old', name: 'Urdu Wise Old Man', gender: VoiceGender.MALE, description: 'Relaxed, Elderly', geminiVoiceName: 'Fenrir', recommendedPitch: -160, isUrdu: true },
  
  // Women
  { id: 'v_mother_solo', name: 'Storyteller Mother', gender: VoiceGender.FEMALE, description: 'Gentle, nurturing, soothing', geminiVoiceName: 'Kore', recommendedPitch: 0 },
  { id: 'v3', name: 'Soft Woman', gender: VoiceGender.FEMALE, description: 'Calm, soothing', geminiVoiceName: 'Kore', recommendedPitch: 0 },
  { id: 'v4', name: 'Energetic Woman', gender: VoiceGender.FEMALE, description: 'Bright, fast', geminiVoiceName: 'Zephyr', recommendedPitch: 0 },
  { id: 'principal_female', name: 'Senior Woman', gender: VoiceGender.FEMALE, description: 'Wise, experienced', geminiVoiceName: 'Kore', recommendedPitch: -120 },
  
  // Kids
  { id: 'v6', name: 'Playful Boy', gender: VoiceGender.CHILD, description: 'Excited, high energy', geminiVoiceName: 'Puck', recommendedPitch: 450 },
  { id: 'v7', name: 'Standard Boy', gender: VoiceGender.CHILD, description: 'Casual, young', geminiVoiceName: 'Puck', recommendedPitch: 300 },
  { id: 'v8', name: 'Baby Girl', gender: VoiceGender.CHILD, description: 'Cute, toddler', geminiVoiceName: 'Kore', recommendedPitch: 600 },
  { id: 'v_girl_happy', name: 'Little Princess', gender: VoiceGender.CHILD, description: 'Happy, sweet', geminiVoiceName: 'Kore', recommendedPitch: 550 },
  { id: 'v_boy_curious', name: 'Curious Explorer', gender: VoiceGender.CHILD, description: 'Inquisitive, young', geminiVoiceName: 'Puck', recommendedPitch: 350 },
];

export const AVAILABLE_PODCAST_PAIRS: PodcastPair[] = [
  {
    id: 'pair_single_mother',
    name: 'Single Mother & Child',
    description: 'Nurturing storytelling duo',
    speaker1: { name: 'Mom', voiceName: 'Kore', label: 'Mother' },
    speaker2: { name: 'Kid', voiceName: 'Zephyr', label: 'Child' }
  },
  {
    id: 'pair_single_father',
    name: 'Single Father & Child',
    description: 'Adventure storytelling duo',
    speaker1: { name: 'Dad', voiceName: 'Fenrir', label: 'Father' },
    speaker2: { name: 'Kid', voiceName: 'Zephyr', label: 'Child' }
  },
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
  }
];

export interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  buffer: AudioBuffer | null;
}
