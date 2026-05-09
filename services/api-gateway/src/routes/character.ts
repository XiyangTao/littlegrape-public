import express from 'express';
import { z } from 'zod';
import { characters, type CharacterRole } from '@/config/characters';

const router = express.Router();

const characterQuerySchema = z.object({
  type: z.enum(['conversation', 'ai_assistant', 'reading_teacher']).optional(),
});

/**
 * 获取角色列表
 * GET /api/characters
 * 可选参数: type=conversation|ai_assistant|reading_teacher（按角色筛选）
 */
router.get('/', (req, res) => {
  const parsed = characterQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid query parameter: type must be "conversation", "ai_assistant", or "reading_teacher"',
    });
    return;
  }

  const { type } = parsed.data;
  const result = type
    ? characters.filter((c) => c.roles.includes(type as CharacterRole))
    : characters;

  res.json({
    success: true,
    data: result,
  });
});

export default router;
