import { IconNames } from '@/components/Icon';
import { ScenarioCategory } from '@/types/conversation';

// 场景分类配置
export const SCENARIO_CATEGORIES: Array<{
  value: ScenarioCategory;
  labelKey: string;
  icon: string;
}> = [
  { value: 'travel', labelKey: 'conversation.category.travel', icon: IconNames.flightTakeoff },
  { value: 'dining_shopping', labelKey: 'conversation.category.dining_shopping', icon: IconNames.restaurant },
  { value: 'business', labelKey: 'conversation.category.business', icon: IconNames.work },
  { value: 'health', labelKey: 'conversation.category.health', icon: IconNames.localHospital },
  { value: 'social', labelKey: 'conversation.category.social', icon: IconNames.groups },
];
