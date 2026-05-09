import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 - 小葡萄",
};

export default function PrivacyPage() {
  return (
    <>
      {/* 移动端 / WebView 内嵌时隐藏全局 Header / Footer，让协议作为独立法律文档展示 */}
      <style>{`body > header, body > footer { display: none !important; }`}</style>
      <div className="max-w-3xl mx-auto px-5 sm:px-6 py-5 sm:py-10">
      {/* 不显示页面 H1: WebView nav bar / 浏览器 tab 已经有 metadata.title 作为标题, 避免重复 */}
      <p className="text-xs text-neutral-500 text-right mb-5 sm:mb-10">版本号：v2.0　　最后更新时间：2026年4月23日</p>

      <Section title="引言">
        <p>
          小葡萄（由上海觅码寻韵科技有限公司运营，以下简称"我们"或"本应用"）深知个人信息对您的重要性，并会全力保护您的个人信息安全可靠。我们承诺按照业界成熟的安全标准，采取相应的安全保护措施来保护您的个人信息。
        </p>
        <p>请在使用我们的产品或服务前，仔细阅读并了解本《隐私政策》。</p>
      </Section>

      <Section title="1. 我们如何收集和使用个人信息">
        <SubSection title="1.1 注册和登录">
          <p>当您注册小葡萄账户时，我们会收集以下信息：</p>
          <ul>
            <li>手机号码（用于短信验证码登录和身份验证）</li>
            <li>微信授权信息（用于微信快捷登录，包括微信昵称和头像）</li>
            <li>用户昵称（用于个人资料展示）</li>
            <li>头像（可选，用于个人资料展示）</li>
          </ul>
        </SubSection>
        <SubSection title="1.2 学习数据">
          <p>为提供个性化英语学习服务，我们会收集：</p>
          <ul>
            <li>学习进度和成绩（单词、语法、阅读等模块）</li>
            <li>语音录音（用于 AI 发音评估，评估完成后录音不会长期存储）</li>
            <li>AI 对话记录（用于提供连续的对话体验和记忆功能）</li>
            <li>学习偏好设置（如英语难度级别、语音语速等）</li>
            <li>每日学习统计（学习时长、完成任务数等）</li>
          </ul>
        </SubSection>
        <SubSection title="1.3 支付信息">
          <p>当您使用付费服务时：</p>
          <ul>
            <li>我们通过支付宝、Apple In-App Purchase 等第三方支付渠道处理支付，不直接收集您的银行卡号等金融信息</li>
            <li>我们会记录订单信息（套餐类型、金额、支付状态）用于服务管理</li>
          </ul>
        </SubSection>
        <SubSection title="1.4 设备信息">
          <p>为保障服务正常运行和安全，我们可能收集：</p>
          <ul>
            <li>设备型号、操作系统版本</li>
            <li>唯一设备标识符（用于防止恶意注册和安全防护）</li>
            <li>应用版本号（用于版本更新检查）</li>
            <li>网络类型（用于优化音频传输质量）</li>
          </ul>
          <p>我们承诺：在您未同意本隐私政策前，不会收集上述任何设备信息；您同意后，仅在为实现对应功能时才进行收集。</p>
        </SubSection>
        <SubSection title="1.5 麦克风权限">
          <p>特别说明：语音录音属于敏感个人信息。我们仅在您主动使用语音相关功能时才进行录音，处理完成后录音不会长期存储。</p>
          <p>本应用需要麦克风权限用于以下功能：</p>
          <ul>
            <li>AI 对话中的语音输入</li>
            <li>英语发音评估和练习</li>
            <li>语音翻译与同声传译功能</li>
          </ul>
          <p>您可以在系统设置中随时关闭麦克风权限，但这将影响语音相关功能的使用。</p>
        </SubSection>
        <SubSection title="1.6 相机/相册权限">
          <p>当您设置或更换头像时，本应用需要相机或相册权限：</p>
          <ul>
            <li>拍摄照片作为头像</li>
            <li>从相册选取图片作为头像</li>
          </ul>
          <p>您可以在系统设置中随时关闭相机/相册权限，这将影响头像上传功能。</p>
        </SubSection>
        <SubSection title="1.7 通知权限">
          <p>我们可能申请通知权限，用于：</p>
          <ul>
            <li>发送每日学习提醒</li>
            <li>推送成就解锁通知</li>
            <li>发送重要服务消息</li>
          </ul>
          <p>您可以在系统设置中随时关闭通知权限。</p>
        </SubSection>
      </Section>

      <Section title="2. 我们如何使用 AI 技术">
        <SubSection title="2.1 服务提供方">
          <p>本应用接入的大语言模型为深度求索公司的 Deepseek Chat（已通过国家网信办生成式人工智能服务备案，备案号：Beijing-DeepseekChat-202404280016），用于智能对话练习、语法纠正与讲解、阅读理解辅助、词汇与句子练习等场景的内容生成。</p>
        </SubSection>
        <SubSection title="2.2 数据使用">
          <p>您的输入用于生成 AI 回复以及维持您与 AI 的连续会话体验，我们不会将您的对话内容用于 AI 模型训练。您可在应用内删除对话历史。</p>
        </SubSection>
        <SubSection title="2.3 内容标识">
          <p>所有 AI 生成的对话回复、语法讲解、阅读译文与解析、练习题等内容，我们均按 GB 45438—2025《网络安全技术 人工智能生成合成内容标识方法》要求添加"内容由 AI 生成"显式标识。</p>
        </SubSection>
        <SubSection title="2.4 内容安全审核">
          <p>为保障内容合规，我们对您输入大模型的文本以及大模型返回的输出文本均接入阿里云内容安全 2.0 服务进行实时审核与二次过滤，屏蔽涉黄、涉暴、涉政、涉恐等不当内容。</p>
        </SubSection>
        <SubSection title="2.5 AI 服务日志">
          <p>为满足《生成式人工智能服务管理暂行办法》监管要求，我们将保存用户输入与模型输出日志不少于 6 个月，仅用于追溯与审计，不会用于其他用途。</p>
        </SubSection>
        <SubSection title="2.6 局限性提示">
          <p>AI 生成内容可能存在错误或不完整之处，请您理性甄别，不应将其作为权威依据。</p>
        </SubSection>
        <SubSection title="2.7 语音服务">
          <p>本应用使用由世纪互联运营的 Microsoft Azure 中国语音服务提供文字转语音（TTS）和语音识别（ASR）功能。您的语音数据传输至由世纪互联运营的 Azure 中国数据中心进行处理，数据存储于中华人民共和国境内。</p>
        </SubSection>
      </Section>

      <Section title="3. 我们如何共享个人信息">
        <p>我们不会向第三方出售您的个人信息。仅在以下情况下共享必要信息：</p>
        <ul>
          <li>大语言模型服务（深度求索 Deepseek Chat）：您输入的对话/学习相关文本（用于生成回复、讲解、练习题等内容）</li>
          <li>语音服务（Microsoft Azure 中国，世纪互联运营）：您的语音录音（用于语音识别与文字转语音）</li>
          <li>内容安全服务（阿里云内容安全 2.0）：您输入的文本、AI 输出的文本、上传的头像、昵称、个人签名（用于违规内容审核）</li>
          <li>对象存储服务（阿里云 OSS）：您上传的头像图片（用于存储与展示）</li>
          <li>支付服务（支付宝、Apple In-App Purchase）：订单信息（用于完成支付流程）</li>
          <li>微信开放平台：微信 OpenID/UnionID、昵称、头像（用于微信登录与授权）</li>
          <li>短信服务提供商：手机号码（用于发送验证码）</li>
          <li>法律要求：根据法律法规、法律程序或政府要求</li>
        </ul>
        <p>上述第三方服务的数据处理均在中华人民共和国境内进行，数据存储于境内服务器。</p>
      </Section>

      <Section title="4. 数据存储和安全">
        <p>4.1 您的数据存储在位于中华人民共和国境内的阿里云服务器上。</p>
        <p>4.2 我们采取以下安全措施保护您的信息：</p>
        <ul>
          <li>数据传输使用 HTTPS 加密</li>
          <li>密码使用 bcrypt 加密存储，不以明文保存</li>
          <li>数据库访问采用严格的权限控制</li>
          <li>定期进行安全评估和漏洞修复</li>
        </ul>
      </Section>

      <Section title="5. 数据保存期限">
        <ul>
          <li>账户信息：在您的账户存续期间保留</li>
          <li>学习数据和 AI 对话记录：在您的账户存续期间保留</li>
          <li>语音录音：仅在评估过程中临时使用，不长期存储</li>
          <li>AI 输入与输出日志：依据《生成式人工智能服务管理暂行办法》要求保存不少于 6 个月</li>
          <li>支付记录：依据法律法规要求保存</li>
          <li>操作日志：最长保存 1 年</li>
        </ul>
        <p>您注销账户后，我们将在合理期限内删除或匿名化处理您的个人信息（法律法规另有规定的除外）。</p>
      </Section>

      <Section title="6. 您的权利">
        <p>根据相关法律法规，您享有以下权利：</p>
        <ul>
          <li>访问和查看您的个人信息</li>
          <li>更正不准确的个人信息</li>
          <li>删除您的个人信息</li>
          <li>注销账户（注销后数据将被永久删除）</li>
          <li>撤回授权同意</li>
          <li>导出您的学习数据</li>
        </ul>
        <p>您可以通过应用内设置页面或联系我们行使上述权利。</p>
      </Section>

      <Section title="7. 未成年人保护">
        <p>7.1 适用范围：本应用为英语学习教育产品，未成年人是重要用户群体之一。我们将按照《未成年人保护法》《儿童个人信息网络保护规定》等法律法规要求，对未成年人个人信息进行严格保护。</p>
        <p>7.2 不满 14 周岁儿童：若您是不满 14 周岁的儿童：</p>
        <ul>
          <li>您必须在父母或监护人的陪同/同意下使用本应用</li>
          <li>注册账户须由监护人代为操作或经监护人同意</li>
          <li>监护人可联系我们查阅、更正、删除儿童的个人信息</li>
          <li>我们仅收集为提供学习服务所必需的最少信息</li>
        </ul>
        <p>7.3 14 周岁以上 18 周岁以下未成年人：建议您在父母或监护人指导下阅读本政策、注册账户和使用付费功能。未成年人付费应当事先取得监护人同意。</p>
        <p>7.4 联系方式：如发现儿童在未经监护人同意下使用本应用，或对未成年人个人信息处理有任何问题，请通过邮箱 team@coderhythm.cn 联系我们，我们将在收到通知后及时核实并处理。</p>
      </Section>

      <Section title="8. 本地数据存储">
        <p>
          本应用会在您的设备本地存储部分数据（如学习缓存、对话记录缓存），以便在网络不稳定时也能使用部分功能。这些数据仅存储在您的设备上，卸载应用后会自动清除。
        </p>
      </Section>

      <Section title="9. 本政策的更新">
        <p>
          我们可能会不定期更新本隐私政策。更新后的政策会在应用内发布。对于重大变更，我们会通过应用内通知等方式告知您。未经您明确同意，我们不会削减您按照本政策所享有的权利。
        </p>
      </Section>

      <Section title="10. 如何联系我们">
        <p>如果您对本隐私政策有任何疑问、意见或建议，或需要行使您的个人信息权利，请通过以下方式联系我们：</p>
        <p className="text-[#7C5CFC] font-medium">邮箱：team@coderhythm.cn</p>
        <p>我们将在15个工作日内回复您的请求。</p>
      </Section>
      </div>
    </>
  );
}

// 字号 / 间距 / 颜色对齐 RN PrivacyPolicyScreen (移动端)
//   sectionTitle 16/24/12  subTitle 15/16/8  paragraph/listItem 14/22/12
//   text.primary #1A1A1A → neutral-900；text.secondary → neutral-500
// sm: 桌面端 (≥640px) 略放大保持阅读体验
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base sm:text-xl font-bold text-neutral-900 mt-6 mb-3 sm:mb-4">{title}</h2>
      <div className="space-y-3 text-sm sm:text-base text-neutral-900 leading-[22px] sm:leading-7 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:my-2 [&_ul>li]:marker:text-neutral-400 [&_ul>li]:pl-1">
        {children}
      </div>
    </section>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-[15px] sm:text-base font-semibold text-neutral-900 mb-2 sm:mb-3">{title}</h3>
      <div className="space-y-2 sm:space-y-3">{children}</div>
    </div>
  );
}
