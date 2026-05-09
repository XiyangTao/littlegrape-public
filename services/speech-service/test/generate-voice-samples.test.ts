/**
 * 生成声音样本音频文件
 * 使用方式: yarn test test/generate-voice-samples.test.ts
 */

// 必须在所有导入之前加载环境变量
import dotenv from 'dotenv';
import path from 'path';
const envPath = path.join(__dirname, '../../../.env');
dotenv.config({ path: envPath });

import { ttsEngineManager } from '@/services/tts-engines';
import * as fs from 'fs/promises';

// 为每个声音生成独特的示例文本，体现各自特点
const generateSampleText = (voiceId: string, name: string): string => {
  const sampleTexts: Record<string, string> = {
    'en-US-female-1': `Hi, I'm ${name}. Let's practice English together in a gentle and clear way.`,
    'en-US-female-2': `Hey! I'm ${name}! So excited to learn with you! Let's make it fun!`,
    'en-US-male-1': `Hello, I'm ${name}. I'm here to guide you with patience and expertise.`,
    'en-US-male-2': `Good day, I'm ${name}. I specialize in business English. Let's achieve your goals.`,
    'en-GB-female-1': `Good afternoon, I'm ${name}. Delighted to help you master the Queen's English.`,
    'en-GB-female-2': `Hello lovely! I'm ${name}. Let's chat and have you sounding like a Londoner!`,
    'en-GB-male-1': `Greetings, I'm ${name}. It's my pleasure to guide you with BBC precision.`,
    'en-GB-male-2': `Hello there, I'm ${name}. Let's explore the beauty of English together.`
  };

  return sampleTexts[voiceId] || `Hello, I'm ${name}.`;
};

describe('生成声音样本', () => {
  // 增加超时时间，因为要调用Azure TTS API
  jest.setTimeout(120000);

  it('应该为所有8个声音生成样本音频', async () => {
    console.log('\n🎤 开始生成声音样本...\n');

    // 检查TTS引擎是否可用
    const isAvailable = await ttsEngineManager.isAvailable();

    if (!isAvailable) {
      console.log('⚠️ Azure TTS引擎未配置，请设置环境变量:');
      console.log('   AZURE_SPEECH_KEY=你的密钥');
      console.log('   AZURE_SPEECH_REGION=你的区域\n');
      console.log('跳过样本生成测试');
      return;
    }

    // 获取所有声音
    const voices = await ttsEngineManager.getVoices();
    console.log(`📋 找到 ${voices.length} 个声音\n`);
    expect(voices.length).toBe(8);

    // 创建samples目录（在项目根目录下）
    const samplesDir = path.join(__dirname, '../samples');
    await fs.mkdir(samplesDir, { recursive: true });
    console.log(`📁 样本目录: ${samplesDir}\n`);

    // 为每个声音生成样本
    for (const voice of voices) {
      console.log(`🎵 生成 ${voice.name} (${voice.variant}, ${voice.gender})...`);

      // 生成示例文本
      const text = generateSampleText(voice.id, voice.name);

      // 合成音频
      const audioBuffer = await ttsEngineManager.synthesize({
        text,
        voice: voice.id,
        speed: 1.0,
        format: 'mp3',
        quality: 'premium'
      });

      expect(audioBuffer).toBeDefined();
      expect(audioBuffer.length).toBeGreaterThan(0);

      // 保存文件
      const fileName = `${voice.name.toLowerCase()}-sample.mp3`;
      const filePath = path.join(samplesDir, fileName);
      await fs.writeFile(filePath, audioBuffer);

      console.log(`   ✅ 已保存: ${fileName} (${audioBuffer.length} bytes)`);
      console.log(`   📝 文本: "${text}"`);
      console.log(`   🎙️ 引擎ID: ${voice.voiceEngineId}\n`);
    }

    console.log('🎉 所有声音样本生成完成！\n');
  });
});
