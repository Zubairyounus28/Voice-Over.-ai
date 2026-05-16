
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
  CORPORATE = 'CORPORATE',
}

export enum AppMode {
  VOICE_OVER = 'VOICE_OVER',
  VIDEO_TO_TEXT = 'VIDEO_TO_TEXT',
  AUDIO_TO_TEXT = 'AUDIO_TO_TEXT',
  VIDEO_TO_MP3 = 'VIDEO_TO_MP3',
  VIDEO_ENHANCER = 'VIDEO_ENHANCER',
  SCRIPT_TO_VIDEO = 'SCRIPT_TO_VIDEO',
  AI_STORY = 'AI_STORY',
  AUDIO_SPLITTER = 'AUDIO_SPLITTER',
  SCRIPT_TO_SHORTS = 'SCRIPT_TO_SHORTS',
  AUDIO_ENHANCER = 'AUDIO_ENHANCER',
  TEACHER = 'TEACHER',
}

export interface VideoCharacter {
  id: string;
  name: string;
  description: string;
  gender: VoiceGender;
  visualTraits: string;
}

export const STORY_CHARACTERS: VideoCharacter[] = [
  {
    id: 'pk_woman_dupatta',
    name: 'Modern Pakistani Woman',
    description: 'Elegant woman wearing a stylish dupatta',
    gender: VoiceGender.FEMALE,
    visualTraits: 'A modern Pakistani woman, graceful features, wearing a beautiful embroidered lawn suit with a stylish dupatta draped over one shoulder, natural makeup, professional and friendly appearance.'
  },
  {
    id: 'pk_man_modern',
    name: 'Modern Pakistani Man',
    description: 'Clean-cut man in contemporary attire',
    gender: VoiceGender.MALE,
    visualTraits: 'A modern Pakistani man, sharp features, well-groomed short hair, wearing a stylish contemporary shalwar kameez or a smart casual button-down shirt, energetic and professional.'
  },
  {
    id: 'pk_girl_modern',
    name: 'Pakistani Modern Girl',
    description: 'Cheerful young girl with traditional accents',
    gender: VoiceGender.CHILD,
    visualTraits: 'A young Pakistani girl, around 8-10 years old, sparkling eyes, long hair, wearing a colorful bright kurti with small dupatta accents, joyful and expressive.'
  },
  {
    id: 'pk_boy_modern',
    name: 'Pakistani Modern Boy',
    description: 'Active young boy in smart clothing',
    gender: VoiceGender.CHILD,
    visualTraits: 'A young Pakistani boy, around 8-10 years old, mischievous smile, wearing a smart casual kurti or polo shirt, energetic and curious.'
  }
];

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
  { id: 'urdu_radio_male', name: 'Urdu Radio Commercial', gender: VoiceGender.MALE, description: 'Deep, resonant, high-impact radio voice', geminiVoiceName: 'Fenrir', recommendedPitch: -120, isUrdu: true },
  { id: 'v1', name: 'Deep Narrator', gender: VoiceGender.MALE, description: 'Authoritative, deep', geminiVoiceName: 'Fenrir', recommendedPitch: -200 },
  { id: 'v2', name: 'Standard Man', gender: VoiceGender.MALE, description: 'Conversational, clear', geminiVoiceName: 'Puck', recommendedPitch: 0 },
  { id: 'urdu_comm_male', name: 'Urdu Commercial (Male)', gender: VoiceGender.MALE, description: 'Natural, professional, bold with high energy. Native ad-style.', geminiVoiceName: 'Fenrir', recommendedPitch: -80, isUrdu: true, stylePrompt: 'Speak as a native Urdu commercial voice artist. Use a bold, professional, and high-energy tone suitable for a high-impact advertisement. Maintain natural flow and native pronunciation.' },
  { id: 'urdu_corporate_male', name: 'Urdu Corporate Intro', gender: VoiceGender.MALE, description: 'Smooth, energetic, professional company intro voice.', geminiVoiceName: 'Fenrir', recommendedPitch: -60, isUrdu: true, stylePrompt: 'Speak as a professional corporate narrator in native Pakistani Urdu. Use a smooth, energetic, and confident tone suitable for a company introduction. Maintain a realistic native accent with clear articulation.' },
  { id: 'urdu_male_narrator', name: 'Urdu Narrator (Male)', gender: VoiceGender.MALE, description: 'Deep, clear Urdu accent', geminiVoiceName: 'Fenrir', recommendedPitch: -50, isUrdu: true },
  { id: 'urdu_wise_old', name: 'Urdu Wise Elder', gender: VoiceGender.MALE, description: 'Relaxed, Grandfatherly', geminiVoiceName: 'Fenrir', recommendedPitch: -160, isUrdu: true },
  
  // Women
  { id: 'v_mother_solo', name: 'Storyteller Mother', gender: VoiceGender.FEMALE, description: 'Gentle, nurturing, soothing', geminiVoiceName: 'Kore', recommendedPitch: 0 },
  { id: 'v3', name: 'Soft Woman', gender: VoiceGender.FEMALE, description: 'Calm, soothing', geminiVoiceName: 'Kore', recommendedPitch: 0 },
  { id: 'urdu_comm_female', name: 'Urdu Commercial (Female)', gender: VoiceGender.FEMALE, description: 'Smooth, polished, professional', geminiVoiceName: 'Kore', recommendedPitch: 0, isUrdu: true },
  { id: 'urdu_female_narrator', name: 'Urdu Narrator (Female)', gender: VoiceGender.FEMALE, description: 'Warm, melodic Urdu accent', geminiVoiceName: 'Kore', recommendedPitch: 0, isUrdu: true },
  { id: 'v4', name: 'Energetic Woman', gender: VoiceGender.FEMALE, description: 'Bright, fast', geminiVoiceName: 'Zephyr', recommendedPitch: 0 },
  
  // Kids
  { id: 'v6', name: 'Playful Boy', gender: VoiceGender.CHILD, description: 'Excited, high energy', geminiVoiceName: 'Puck', recommendedPitch: 450 },
  { id: 'v_boy_urdu', name: 'Urdu Little Boy', gender: VoiceGender.CHILD, description: 'Sweet, innocent Urdu boy', geminiVoiceName: 'Puck', recommendedPitch: 400, isUrdu: true },
  { id: 'v8', name: 'Baby Girl', gender: VoiceGender.CHILD, description: 'Cute, toddler', geminiVoiceName: 'Kore', recommendedPitch: 600 },
  { id: 'v_girl_urdu', name: 'Urdu Little Princess', gender: VoiceGender.CHILD, description: 'Happy, sweet Urdu girl', geminiVoiceName: 'Kore', recommendedPitch: 550, isUrdu: true },
];

export const AVAILABLE_PODCAST_PAIRS: PodcastPair[] = [
  {
    id: 'pair_father_son',
    name: 'Father & Son',
    description: 'A deep dad voice and a playful boy',
    speaker1: { name: 'Dad', voiceName: 'Fenrir', label: 'Father' },
    speaker2: { name: 'Son', voiceName: 'Puck', label: 'Boy' }
  },
  {
    id: 'pair_mother_son',
    name: 'Mother & Son',
    description: 'A nurturing mom and an energetic boy',
    speaker1: { name: 'Mom', voiceName: 'Kore', label: 'Mother' },
    speaker2: { name: 'Son', voiceName: 'Puck', label: 'Boy' }
  },
  {
    id: 'pair_father_daughter',
    name: 'Father & Daughter',
    description: 'A calm dad and a sweet little girl',
    speaker1: { name: 'Dad', voiceName: 'Fenrir', label: 'Father' },
    speaker2: { name: 'Daughter', voiceName: 'Kore', label: 'Girl' }
  },
  {
    id: 'pair_mother_daughter',
    name: 'Mother & Daughter',
    description: 'A warm mom and a bubbly little girl',
    speaker1: { name: 'Mom', voiceName: 'Kore', label: 'Mother' },
    speaker2: { name: 'Daughter', voiceName: 'Zephyr', label: 'Girl' }
  },
  {
    id: 'pair_male_female',
    name: 'Host & Co-Host',
    description: 'Classic professional duo',
    speaker1: { name: 'Alex', voiceName: 'Fenrir', label: 'Male' },
    speaker2: { name: 'Sarah', voiceName: 'Kore', label: 'Female' }
  }
];

export interface AudioState {
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  buffer: AudioBuffer | null;
}
