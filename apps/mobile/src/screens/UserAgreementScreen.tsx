import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';

interface UserAgreementScreenProps {
  onBack: () => void;
}

export default function UserAgreementScreen({ onBack }: UserAgreementScreenProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background.primary} />

      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>用户服务协议</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 内容 */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.updateDate}>版本号：v2.0    最后更新时间：2026年4月23日</Text>

          <Text style={styles.sectionTitle}>欢迎使用小葡萄</Text>
          <Text style={styles.paragraph}>
            感谢您选择小葡萄（以下简称"本应用"或"我们"）。本用户服务协议（以下简称"本协议"）是您与上海觅码寻韵科技有限公司之间关于使用本应用服务的法律协议。请您在使用前仔细阅读本协议全部条款。一旦您注册、登录或使用本应用，即表示您已阅读并同意接受本协议的约束。
          </Text>

          <Text style={styles.sectionTitle}>1. 服务说明</Text>
          <Text style={styles.paragraph}>
            小葡萄是一款基于人工智能技术的英语学习应用，为用户提供以下服务：
          </Text>
          <Text style={styles.listItem}>• AI 对话伙伴：与不同性格的 AI 角色进行英语对话练习</Text>
          <Text style={styles.listItem}>• 剧情式学习：通过互动故事场景进行沉浸式英语练习</Text>
          <Text style={styles.listItem}>• 经典名著精读：阅读原版英文名著，结合 AI 词义查询辅助精读</Text>
          <Text style={styles.listItem}>• 发音评估：基于语音识别技术评估和改进英语发音</Text>
          <Text style={styles.listItem}>• 词汇学习：系统化的单词记忆、复习和测试</Text>
          <Text style={styles.listItem}>• 语法练习：针对性的语法知识讲解和训练</Text>
          <Text style={styles.listItem}>• 听力训练：英语听力材料训练</Text>
          <Text style={styles.listItem}>• 文章精读：英语文章精读与翻译</Text>
          <Text style={styles.listItem}>• 语音翻译与同声传译：实时语音识别、翻译和同传练习</Text>
          <Text style={styles.listItem}>• 学习数据分析：学习进度跟踪和个性化建议</Text>

          <Text style={styles.sectionTitle}>2. 用户注册和账户</Text>
          <Text style={styles.paragraph}>
            2.1 您可以通过手机号或微信授权方式注册和登录账户。注册时，您应提供真实、准确、完整的信息。
          </Text>
          <Text style={styles.paragraph}>
            2.2 您有责任妥善保管账户信息和密码安全，不得将账户转让或授权他人使用。因您保管不善导致的损失由您自行承担。
          </Text>
          <Text style={styles.paragraph}>
            2.3 同一手机号或邮箱仅可注册一个账户。
          </Text>

          <Text style={styles.sectionTitle}>3. 付费服务</Text>
          <Text style={styles.paragraph}>
            3.1 本应用提供免费体验和付费订阅服务。新用户注册后可获得限时体验资格。
          </Text>
          <Text style={styles.paragraph}>
            3.2 付费订阅分为月付和年付，具体套餐内容和价格以应用内展示为准。
          </Text>
          <Text style={styles.paragraph}>
            3.3 付费服务通过支付宝、Apple In-App Purchase 等第三方支付渠道完成支付。支付成功后，订阅立即生效。
          </Text>
          <Text style={styles.paragraph}>
            3.4 订阅到期后不会自动续费。如需继续使用付费功能，需要手动续费。
          </Text>
          <Text style={styles.paragraph}>
            3.5 退款规则：已购买的订阅服务，符合下列情形之一的可申请退款：（1）因我方原因导致服务不可用；（2）服务功能与宣传严重不符；（3）法律法规规定的其他情形。其他情况下原则上不支持退款。通过 Apple App Store 渠道购买的订阅，退款由 Apple 按其规则统一处理。
          </Text>
          <Text style={styles.paragraph}>
            3.6 未成年人付费保护：未成年人使用付费功能应当事先取得父母或监护人同意。若发现未成年人未经监护人同意付费，监护人可通过邮箱 team@coderhythm.cn 联系我们申请退款，我们将在核实情况后依法依规处理。
          </Text>

          <Text style={styles.sectionTitle}>4. 用户行为规范</Text>
          <Text style={styles.paragraph}>
            在使用本应用时，您承诺：
          </Text>
          <Text style={styles.listItem}>• 遵守中华人民共和国相关法律法规和社会公德</Text>
          <Text style={styles.listItem}>• 不利用 AI 对话功能生成、传播违法、有害或不当内容</Text>
          <Text style={styles.listItem}>• 不进行恶意注册、滥用体验资格等破坏行为</Text>
          <Text style={styles.listItem}>• 不对本应用进行反向工程、反编译或破解</Text>
          <Text style={styles.listItem}>• 不干扰或破坏本应用的正常运行</Text>

          <Text style={styles.sectionTitle}>5. AI 生成内容声明</Text>
          <Text style={styles.paragraph}>
            5.1 本应用接入国家网信办已备案的大语言模型（深度求索 Deepseek Chat，备案号：Beijing-DeepseekChat-202404280016），用于智能对话练习、语法纠正与讲解、阅读理解辅助、词汇与句子练习等功能的内容生成。
          </Text>
          <Text style={styles.paragraph}>
            5.2 所有 AI 生成的对话回复、讲解、译文、练习题等内容，我们均按 GB 45438—2025《网络安全技术 人工智能生成合成内容标识方法》要求添加"内容由 AI 生成"显式标识，您可清晰识别。
          </Text>
          <Text style={styles.paragraph}>
            5.3 内容安全：本应用对您输入大模型的文本以及大模型返回的输出文本均接入阿里云内容安全 2.0 服务进行实时审核与二次过滤，禁止生成涉及违法违规、色情、暴力、政治、宗教等不当内容。
          </Text>
          <Text style={styles.paragraph}>
            5.4 局限性：AI 生成内容仅供英语学习参考，不代表我们的观点或立场，可能存在不准确或不完整之处，用户应自行判断和甄别，不应将其作为权威依据。
          </Text>
          <Text style={styles.paragraph}>
            5.5 您的责任：您不得利用本应用 AI 功能生成、传播违法、有害或侵犯他人权益的内容；不得将 AI 生成内容用于任何违法违规目的；不得删除或篡改 AI 内容标识后对外宣称为人工创作。因您违规使用 AI 功能产生的后果由您自行承担。
          </Text>

          <Text style={styles.sectionTitle}>6. 知识产权</Text>
          <Text style={styles.paragraph}>
            6.1 本应用的所有内容，包括但不限于文字、图片、音频、视频、软件代码、AI 模型、角色设计、界面设计等，均受知识产权法保护，归我们或相关权利人所有。
          </Text>
          <Text style={styles.paragraph}>
            6.2 未经我们书面许可，您不得以任何方式复制、传播、修改或用于商业目的。
          </Text>

          <Text style={styles.sectionTitle}>7. 隐私保护</Text>
          <Text style={styles.paragraph}>
            我们高度重视用户隐私保护，具体内容请参阅我们的《隐私政策》。该政策详细说明了我们如何收集、使用、存储和保护您的个人信息。
          </Text>

          <Text style={styles.sectionTitle}>8. 未成年人保护</Text>
          <Text style={styles.paragraph}>
            8.1 本应用为英语学习教育产品，未成年人是重要用户群体之一。我们将按照《未成年人保护法》《儿童个人信息网络保护规定》等法律法规要求，对未成年人权益进行保护。
          </Text>
          <Text style={styles.paragraph}>
            8.2 若您是不满 14 周岁的儿童，您必须在父母或法定监护人的陪同/同意下使用本应用，注册账户须由监护人代为操作或经监护人同意。
          </Text>
          <Text style={styles.paragraph}>
            8.3 若您是 14 周岁以上 18 周岁以下的未成年人，建议您在父母或监护人指导下阅读本协议、注册账户和使用本应用。
          </Text>
          <Text style={styles.paragraph}>
            8.4 关于未成年人付费保护的具体规则，请参见本协议第 3.6 条。
          </Text>
          <Text style={styles.paragraph}>
            8.5 监护人有权查阅、更正、删除未成年人的个人信息，相关请求可通过 team@coderhythm.cn 提交。
          </Text>

          <Text style={styles.sectionTitle}>9. 服务变更和中断</Text>
          <Text style={styles.paragraph}>
            9.1 我们保留随时修改、暂停或终止部分或全部服务的权利，但会尽可能提前通知用户。
          </Text>
          <Text style={styles.paragraph}>
            9.2 因系统维护、升级、不可抗力或第三方服务（如 AI 接口、支付渠道）异常导致的服务中断，我们不承担责任。
          </Text>

          <Text style={styles.sectionTitle}>10. 免责声明</Text>
          <Text style={styles.paragraph}>
            10.1 本应用仅作为英语学习辅助工具，不保证学习效果，不替代正规教育。
          </Text>
          <Text style={styles.paragraph}>
            10.2 因用户自身原因（包括但不限于网络环境、设备兼容性）导致无法正常使用服务的，我们不承担责任。
          </Text>

          <Text style={styles.sectionTitle}>11. 账户注销</Text>
          <Text style={styles.paragraph}>
            您可以在应用内申请注销账户。注销前建议导出您的学习数据。注销后，您的个人信息和学习数据将被删除且不可恢复，未使用完的付费订阅不予退款。
          </Text>

          <Text style={styles.sectionTitle}>12. 争议解决</Text>
          <Text style={styles.paragraph}>
            因本协议产生的争议，应首先通过友好协商解决。协商不成的，提交上海市有管辖权的人民法院解决。
          </Text>

          <Text style={styles.sectionTitle}>13. 其他条款</Text>
          <Text style={styles.paragraph}>
            13.1 如本协议的任何条款被认定为无效或不可执行，不影响其他条款的效力。
          </Text>
          <Text style={styles.paragraph}>
            13.2 我们可能会不定期修订本协议，修订后的协议会在应用内公布。继续使用本应用即表示您接受修订后的协议。
          </Text>
          <Text style={styles.paragraph}>
            13.3 本协议的最终解释权归上海觅码寻韵科技有限公司所有。
          </Text>

          <Text style={styles.sectionTitle}>14. 联系我们</Text>
          <Text style={styles.paragraph}>
            如您对本协议有任何疑问、意见或建议，请通过以下方式联系我们：
          </Text>
          <Text style={styles.contactInfo}>邮箱：team@coderhythm.cn</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  updateDate: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    textAlign: 'right',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 24,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginBottom: 12,
  },
  listItem: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 22,
    marginBottom: 8,
    marginLeft: 8,
  },
  contactInfo: {
    fontSize: 14,
    color: theme.colors.primary,
    lineHeight: 22,
    marginBottom: 8,
  },
});
