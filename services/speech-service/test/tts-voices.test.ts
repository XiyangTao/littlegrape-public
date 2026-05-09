/**
 * TTS Voices API 测试
 * 测试语音列表接口的正确性
 */

import { ttsEngineManager } from '@/services/tts-engines';

describe('TTS Voices API', () => {
  describe('获取所有声音', () => {
    it('应该返回8个声音（美式4个+英式4个）', async () => {
      const voices = await ttsEngineManager.getVoices();

      expect(voices).toBeDefined();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBe(8);
    });

    it('每个声音应该包含必需的字段', async () => {
      const voices = await ttsEngineManager.getVoices();

      voices.forEach(voice => {
        expect(voice).toHaveProperty('id');
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('gender');
        expect(voice).toHaveProperty('language');
        expect(voice).toHaveProperty('variant');
        expect(voice).toHaveProperty('accent');
        expect(voice).toHaveProperty('avatar');
        expect(voice).toHaveProperty('sampleAudio');
        expect(voice).toHaveProperty('description');
        expect(voice).toHaveProperty('voiceEngineId');

        // 验证字段类型
        expect(typeof voice.id).toBe('string');
        expect(typeof voice.name).toBe('string');
        expect(['male', 'female']).toContain(voice.gender);
        expect(typeof voice.language).toBe('string');
        expect(['american', 'british']).toContain(voice.variant);
        expect(typeof voice.accent).toBe('string');
        expect(typeof voice.avatar).toBe('string');
        expect(typeof voice.sampleAudio).toBe('string');
        expect(typeof voice.description).toBe('string');
        expect(typeof voice.voiceEngineId).toBe('string');
      });
    });

    it('应该有正确的性别分布（每种变体2男2女）', async () => {
      const voices = await ttsEngineManager.getVoices();

      const americanVoices = voices.filter(v => v.variant === 'american');
      const britishVoices = voices.filter(v => v.variant === 'british');

      // 美式英语：2男2女
      const americanMale = americanVoices.filter(v => v.gender === 'male');
      const americanFemale = americanVoices.filter(v => v.gender === 'female');
      expect(americanMale.length).toBe(2);
      expect(americanFemale.length).toBe(2);

      // 英式英语：2男2女
      const britishMale = britishVoices.filter(v => v.gender === 'male');
      const britishFemale = britishVoices.filter(v => v.gender === 'female');
      expect(britishMale.length).toBe(2);
      expect(britishFemale.length).toBe(2);
    });
  });

  describe('按变体筛选声音', () => {
    it('应该返回4个美式英语声音', async () => {
      const voices = await ttsEngineManager.getVoices('american');

      expect(voices).toBeDefined();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBe(4);

      voices.forEach(voice => {
        expect(voice.variant).toBe('american');
        expect(voice.language).toBe('en-US');
      });
    });

    it('应该返回4个英式英语声音', async () => {
      const voices = await ttsEngineManager.getVoices('british');

      expect(voices).toBeDefined();
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBe(4);

      voices.forEach(voice => {
        expect(voice.variant).toBe('british');
        expect(voice.language).toBe('en-GB');
      });
    });
  });

  describe('声音ID和引擎ID', () => {
    it('每个声音应该有唯一的ID', async () => {
      const voices = await ttsEngineManager.getVoices();
      const ids = voices.map(v => v.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('每个声音应该有有效的voiceEngineId（Azure Neural Voice）', async () => {
      const voices = await ttsEngineManager.getVoices();

      voices.forEach(voice => {
        expect(voice.voiceEngineId).toBeTruthy();
        expect(voice.voiceEngineId).toMatch(/^en-(US|GB)-\w+Neural$/);
      });
    });

    it('美式英语声音应该使用en-US的Azure Voice ID', async () => {
      const voices = await ttsEngineManager.getVoices('american');

      voices.forEach(voice => {
        expect(voice.voiceEngineId).toMatch(/^en-US-\w+Neural$/);
      });
    });

    it('英式英语声音应该使用en-GB的Azure Voice ID', async () => {
      const voices = await ttsEngineManager.getVoices('british');

      voices.forEach(voice => {
        expect(voice.voiceEngineId).toMatch(/^en-GB-\w+Neural$/);
      });
    });
  });

  describe('声音URL和描述', () => {
    it('每个声音都应该有头像URL', async () => {
      const voices = await ttsEngineManager.getVoices();

      voices.forEach(voice => {
        expect(voice.avatar).toBeTruthy();
        expect(voice.avatar).toMatch(/^https:\/\/cdn\.littlegrape\.app\/avatars\/.+\.jpg$/);
      });
    });

    it('每个声音都应该有示例音频URL', async () => {
      const voices = await ttsEngineManager.getVoices();

      voices.forEach(voice => {
        expect(voice.sampleAudio).toBeTruthy();
        expect(voice.sampleAudio).toMatch(/^https:\/\/cdn\.littlegrape\.app\/samples\/.+\.mp3$/);
      });
    });

    it('每个声音都应该有中文描述', async () => {
      const voices = await ttsEngineManager.getVoices();

      voices.forEach(voice => {
        expect(voice.description).toBeTruthy();
        expect(voice.description.length).toBeGreaterThan(0);
        // 验证描述是中文
        expect(/[\u4e00-\u9fa5]/.test(voice.description)).toBe(true);
      });
    });
  });

  describe('特定声音验证', () => {
    it('应该包含Emma（美式女声）', async () => {
      const voices = await ttsEngineManager.getVoices('american');
      const emma = voices.find(v => v.name === 'Emma');

      expect(emma).toBeDefined();
      expect(emma?.gender).toBe('female');
      expect(emma?.voiceEngineId).toBe('en-US-JennyNeural');
    });

    it('应该包含Michael（美式男声）', async () => {
      const voices = await ttsEngineManager.getVoices('american');
      const michael = voices.find(v => v.name === 'Michael');

      expect(michael).toBeDefined();
      expect(michael?.gender).toBe('male');
      expect(michael?.voiceEngineId).toBe('en-US-GuyNeural');
    });

    it('应该包含Sophie（英式女声）', async () => {
      const voices = await ttsEngineManager.getVoices('british');
      const sophie = voices.find(v => v.name === 'Sophie');

      expect(sophie).toBeDefined();
      expect(sophie?.gender).toBe('female');
      expect(sophie?.voiceEngineId).toBe('en-GB-SoniaNeural');
    });

    it('应该包含Oliver（英式男声）', async () => {
      const voices = await ttsEngineManager.getVoices('british');
      const oliver = voices.find(v => v.name === 'Oliver');

      expect(oliver).toBeDefined();
      expect(oliver?.gender).toBe('male');
      expect(oliver?.voiceEngineId).toBe('en-GB-RyanNeural');
    });
  });

  describe('引擎可用性', () => {
    it('TTS引擎管理器应该正常初始化', () => {
      expect(ttsEngineManager).toBeDefined();
      expect(ttsEngineManager.getEngine).toBeDefined();
    });

    it('应该能获取Azure引擎实例', () => {
      const engine = ttsEngineManager.getEngine();
      expect(engine).toBeDefined();
      expect(engine.name).toBe('azure');
    });
  });
});
