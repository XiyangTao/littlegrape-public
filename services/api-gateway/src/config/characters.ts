// eslint-disable-next-line @typescript-eslint/no-var-requires
const characterData = require('@littlegrape/shared') as {
  characters: Array<{
    id: string;
    name: string;
    roles: string[];
    gender: 'male' | 'female';
    age: number;
    avatar: string;
    description: string;
    personality: string;
    appearance: string;
    speakingStyle: string;
    catchphrase: string;
    teacherRole?: string;
    teacherStyle?: string;
    greetingAudio?: string;
    voice: {
      engineId: string;
      doubaoEngineId?: string;
      defaultEngine?: string;
      language: string;
      variant: string;
      accent: string;
    };
    sortOrder: number;
  }>;
};

export type CharacterRole = 'conversation' | 'ai_assistant' | 'reading_teacher';

export interface Character {
  id: string;
  name: string;
  roles: CharacterRole[];
  gender: 'male' | 'female';
  age: number | null;
  language: string;
  variant: 'american' | 'british' | 'multilingual';
  accent: string;
  personality: string;
  appearance: string;
  speakingStyle: string;
  catchphrase: string;
  avatar: string;
  voiceEngineId: string;
  description: string;
  sortOrder: number;
  teacherRole?: string;
  teacherStyle?: string;
  greetingAudio?: string;
}

export const characters: Character[] = characterData.characters.map((c) => ({
  id: c.id,
  name: c.name,
  roles: c.roles as CharacterRole[],
  gender: c.gender,
  age: c.age ?? null,
  language: c.voice.language,
  variant: c.voice.variant as Character['variant'],
  accent: c.voice.accent,
  personality: c.personality,
  appearance: c.appearance,
  speakingStyle: c.speakingStyle,
  catchphrase: c.catchphrase,
  avatar: c.avatar,
  voiceEngineId: c.voice.engineId,
  description: c.description,
  sortOrder: c.sortOrder,
  ...(c.teacherRole ? { teacherRole: c.teacherRole, teacherStyle: c.teacherStyle } : {}),
  ...(c.greetingAudio ? { greetingAudio: c.greetingAudio } : {}),
}));

/** 按角色类型筛选角色 */
export function getCharactersByRole(role: CharacterRole): Character[] {
  return characters.filter((c) => c.roles.includes(role));
}

/** 按 ID 查找角色 */
export function getCharacterById(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

/** 获取精读教师列表 */
export function getReadingTeachers(): Character[] {
  return getCharactersByRole('reading_teacher');
}
