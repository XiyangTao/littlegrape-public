/**
 * 同声传译预设音色（火山 Seed LiveInterpret 2.0 官方支持）
 *
 * 火山同传 2.0 仅支持以下 3 个精品音色作为输出音频的说话人。
 * 传错或不传 → 降级为"复刻输入音频音色"（用说话人自己的声音输出译文）。
 *
 * 来源：火山 AST 2.0 官方 API 文档
 */

export interface InterpretationVoice {
  id: string;           // speaker_id，透传给火山
  nameKey: string;      // i18n key
  genderKey: 'female' | 'male';
}

export const INTERPRETATION_VOICES: InterpretationVoice[] = [
  { id: 'zh_female_vv_uranus_bigtts',              nameKey: 'interpretation.voice.vv',            genderKey: 'female' },
  { id: 'zh_female_xiaoai_uranus_bigtts',          nameKey: 'interpretation.voice.xiaoai',        genderKey: 'female' },
  { id: 'zh_male_jingqiangkanye_emo_mars_bigtts',  nameKey: 'interpretation.voice.jingqiangkanye', genderKey: 'male' },
];

/** 特殊值：不传则让火山复刻输入音频的说话人音色（用自己的声音说外语） */
export const INTERPRETATION_VOICE_CLONE = '';

/** 默认音色：复刻用户自己的声音（同传 2.0 的核心卖点） */
export const DEFAULT_INTERPRETATION_VOICE = INTERPRETATION_VOICE_CLONE;
