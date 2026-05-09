import { Router } from 'express';
import queryRoutes from './query';
import progressRoutes from './progress';
import favoritesRoutes from './favorites';
import difficultRoutes from './difficult';
import practicesRoutes from './practices';
import lookupRoutes from './lookup';
const router = Router();

router.use('/', queryRoutes);
router.use('/', progressRoutes);
router.use('/', favoritesRoutes);
router.use('/', difficultRoutes);
router.use('/', practicesRoutes);
router.use('/', lookupRoutes);

export default router;
