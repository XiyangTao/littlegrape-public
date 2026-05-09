import ExpoModulesCore
import ATAuthSDK
import UIKit

public class AliyunPNVSModule: Module {

  // PNVS 协议 checkbox 当前状态 — 通过 PNSCodeLoginControllerClickCheckBoxBtn 回调维护
  // 自定义"使用其他方式登录"按钮点击时读这个值做合规校验
  // 单线程访问（main thread），无需 lock
  private var isProtocolChecked = false

  // getLoginToken 异步通过 SDK 闭包 callback 返回结果，把当前 promise 提到模块级
  // 让 dismissLoginPage 能主动 reject 旧 promise（与 Android pendingLoginPromise 对称：
  // AppState 回前台重弹流程不再依赖 SDK 自己异步触发 cancel 回调，能立即 settle）
  // 单线程访问（main thread），无需 lock
  private var pendingLoginPromise: Promise?

  public func definition() -> ModuleDefinition {
    Name("AliyunPNVS")

    // 授权页内底部按钮事件，RN 监听后切换到自有微信登录流程
    Events("PNVS_SwitchToWechat")

    AsyncFunction("setAuthSDKInfo") { (secret: String, promise: Promise) in
      DispatchQueue.main.async {
        TXCommonHandler.sharedInstance().setAuthSDKInfo(secret) { dict in
          let code = (dict["resultCode"] as? String) ?? ""
          if code == PNSCodeSuccess {
            promise.resolve(true)
          } else {
            let msg = (dict["msg"] as? String) ?? "setAuthSDKInfo failed"
            promise.reject("E_SDK_INIT", "\(code): \(msg)")
          }
        }
      }
    }

    AsyncFunction("checkEnvAvailable") { (promise: Promise) in
      DispatchQueue.main.async {
        TXCommonHandler.sharedInstance().checkEnvAvailable(with: .typeLoginToken) { dict in
          let dict = dict ?? [:]
          let code = (dict["resultCode"] as? String) ?? ""
          promise.resolve(code == PNSCodeSuccess)
        }
      }
    }

    AsyncFunction("preLogin") { (timeoutMs: Double, promise: Promise) in
      DispatchQueue.main.async {
        TXCommonHandler.sharedInstance().accelerateLoginPage(withTimeout: timeoutMs / 1000.0) { dict in
          let code = (dict["resultCode"] as? String) ?? ""
          if code == PNSCodeSuccess {
            let masked = (dict["number"] as? String) ?? ""
            // iOS 端 SDK 在 preLogin 阶段就能拿到掩码号；Android 端拿不到（接口签名不同）
            let carrier = (dict["vendor"] as? String) ?? "CMCC"
            promise.resolve([
              "maskedPhone": masked,
              "carrier": carrier
            ])
          } else {
            let msg = (dict["msg"] as? String) ?? "preLogin failed"
            let errCode = self.mapPreLoginErrorCode(code)
            promise.reject(errCode, "\(code): \(msg)")
          }
        }
      }
    }

    AsyncFunction("getLoginToken") { (timeoutMs: Double, theme: [String: Any]?, promise: Promise) in
      DispatchQueue.main.async { [weak self] in
        guard let self = self else {
          promise.reject("E_NO_MODULE", "module released")
          return
        }
        guard let rootVC = AliyunPNVSModule.topViewController() else {
          promise.reject("E_NO_VC", "rootViewController not available")
          return
        }
        // 每次拉起授权页时 PNVS checkbox 默认未勾选，重置缓存状态
        self.isProtocolChecked = false

        // customViewBlock 在视图加载时被调用，按钮点击 → emit RN event
        let model = self.buildCustomModel(theme ?? [:])

        // 替换之前可能未结束的 promise（与 Android pendingLoginPromise.getAndSet 对称，保护性）
        if let old = self.pendingLoginPromise {
          self.pendingLoginPromise = nil
          old.reject("E_REPLACED", "新请求覆盖旧请求")
        }
        self.pendingLoginPromise = promise

        TXCommonHandler.sharedInstance().getLoginToken(
          withTimeout: timeoutMs / 1000.0,
          controller: rootVC,
          model: model
        ) { dict in
          let code = (dict["resultCode"] as? String) ?? ""

          // 600001: 授权页弹出成功 — 等待用户操作
          // 700001: 用户点切换其他登录方式
          // 700002: 用户点登录按钮（中间态）
          // 700003-700004: 协议勾选/点击事件
          // 600000: 最终成功 → resolve
          // 700000: 用户取消 → reject USER_CANCELLED
          // 其他失败 → reject

          // promise 已被 dismissLoginPage / 重弹流程清理 → 丢弃这次 SDK 迟到 callback
          guard self.pendingLoginPromise === promise else { return }

          switch code {
          case PNSCodeSuccess:
            self.pendingLoginPromise = nil
            let token = (dict["token"] as? String) ?? ""
            TXCommonHandler.sharedInstance().cancelLoginVCAnimated(true, complete: nil)
            promise.resolve(token)
          case PNSCodeLoginControllerClickCancel,
               PNSCodeLoginControllerClickChangeBtn:
            self.pendingLoginPromise = nil
            TXCommonHandler.sharedInstance().cancelLoginVCAnimated(true, complete: nil)
            promise.reject("USER_CANCELLED", "用户已取消")
          case PNSCodeLoginControllerClickCheckBoxBtn:
            // 同步协议 checkbox 状态供"使用其他方式登录"做合规校验；不结束流程
            let checked = (dict["isChecked"] as? Bool) ?? false
            self.isProtocolChecked = checked
            return
          case PNSCodeLoginControllerPresentSuccess,
               PNSCodeLoginControllerPresentFailed,
               PNSCodeLoginControllerClickLoginBtn,
               PNSCodeLoginControllerClickProtocol:
            // 中间态，不处理
            return
          default:
            self.pendingLoginPromise = nil
            let msg = (dict["msg"] as? String) ?? "getLoginToken failed"
            TXCommonHandler.sharedInstance().cancelLoginVCAnimated(true, complete: nil)
            promise.reject("E_GET_TOKEN", "\(code): \(msg)")
          }
        }
      }
    }

    AsyncFunction("dismissLoginPage") { (promise: Promise) in
      DispatchQueue.main.async { [weak self] in
        // 主动 reject 旧 promise（与 Android 对称：不依赖 SDK 异步触发 cancel 回调，
        // AppState 重弹流程能立刻 settle，旧 callback 因 === 检查失败被丢弃）
        if let old = self?.pendingLoginPromise {
          self?.pendingLoginPromise = nil
          old.reject("USER_CANCELLED", "已关闭")
        }
        TXCommonHandler.sharedInstance().cancelLoginVCAnimated(true) {
          promise.resolve(nil)
        }
      }
    }
  }

  // ============== Helpers ==============

  private func mapPreLoginErrorCode(_ pnsCode: String) -> String {
    switch pnsCode {
    case PNSCodeNoSIMCard: return "NO_SIM"
    case PNSCodeNoCellularNetwork: return "NETWORK_UNAVAILABLE"
    case PNSCodeUnknownOperator, PNSCodeCarrierChanged: return "CARRIER_NOT_SUPPORTED"
    case PNSCodeInterfaceTimeout: return "TIMEOUT"
    case PNSCodeInterfaceLimited: return "RATE_LIMITED"
    default: return "PRE_LOGIN_FAILED"
    }
  }

  /// 把 logo 合成进一张带白色圆角卡片 + 紫色光晕阴影的 image。
  /// PNVS iOS SDK 不暴露 logo 容器的 CALayer 配置，唯一办法是把阴影"绘制"进 image 本身。
  /// 输出尺寸 = cardSize + shadowPadding * 2，留给阴影扩散空间。
  fileprivate static func composeLogoWithShadow(
    _ image: UIImage,
    cardSize: CGFloat,
    cornerRadius: CGFloat,
    shadowPadding: CGFloat,
    shadowColor: UIColor,
    shadowOffset: CGSize,
    shadowBlur: CGFloat
  ) -> UIImage {
    let total = CGSize(width: cardSize + shadowPadding * 2, height: cardSize + shadowPadding * 2)
    UIGraphicsBeginImageContextWithOptions(total, false, 0)
    defer { UIGraphicsEndImageContext() }
    guard let ctx = UIGraphicsGetCurrentContext() else { return image }

    let cardRect = CGRect(x: shadowPadding, y: shadowPadding, width: cardSize, height: cardSize)
    let cardPath = UIBezierPath(roundedRect: cardRect, cornerRadius: cornerRadius)

    // 1) 先画带阴影的白色圆角底卡 — 阴影由这一步投出
    ctx.saveGState()
    ctx.setShadow(offset: shadowOffset, blur: shadowBlur, color: shadowColor.cgColor)
    UIColor.white.setFill()
    cardPath.fill()
    ctx.restoreGState()

    // 2) 关掉阴影，把 logo 画在卡片内部（圆角剪裁，让带白底的 AppIcon 也不会溢出）
    ctx.saveGState()
    cardPath.addClip()
    image.draw(in: cardRect)
    ctx.restoreGState()

    return UIGraphicsGetImageFromCurrentImageContext() ?? image
  }

  private static func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .first { $0.activationState == .foregroundActive }
    let window = scenes?.windows.first { $0.isKeyWindow } ?? scenes?.windows.first
    var top = window?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }

  private func buildCustomModel(_ theme: [String: Any]) -> TXCustomModel {
    let model = TXCustomModel()

    // 主题色（葡萄紫）
    let themeColorHex = (theme["themeColor"] as? String) ?? "#7C5CFC"
    let primary = UIColor(hex: themeColorHex)

    // ===== 导航栏 =====
    model.navTitle = NSAttributedString(string: "")
    model.navColor = .white
    model.navTintColor = UIColor(hex: "#1A1A1A")

    // 协议详情页 WebView nav 返回按钮（与主授权页 nav 独立字段；不显式设会缺返回按钮）
    model.privacyNavBackImage = UIImage(systemName: "chevron.left")?
      .withTintColor(UIColor(hex: "#1A1A1A"), renderingMode: .alwaysOriginal)

    // ===== Logo（合成带紫色光晕阴影的图，对齐 fallback UI logoWrap）=====
    // PNVS iOS 不暴露 logo 的 layer.shadow 配置，唯一能挂阴影的办法是把阴影画进 image 本身。
    // logoSize = 卡片 72 + 上下左右各 18 padding 给阴影扩散空间 = 108
    let baseLogo = UIImage(named: (theme["logoName"] as? String) ?? "AppIcon") ?? UIImage()
    model.logoImage = AliyunPNVSModule.composeLogoWithShadow(
      baseLogo,
      cardSize: 72,
      cornerRadius: 20,
      shadowPadding: 18,
      shadowColor: primary.withAlphaComponent(0.22),
      shadowOffset: CGSize(width: 0, height: 6),
      shadowBlur: 16
    )
    model.logoSize = CGSize(width: 108, height: 108)

    // ===== Slogan（大标题 + 副标题，对齐 fallback UI title/subtitle）=====
    // PNVS iOS 没有"大标题"字段，但 sloganText 接受 NSAttributedString 多段渲染
    let slogan = NSMutableAttributedString()
    slogan.append(NSAttributedString(string: "欢迎使用小葡萄\n", attributes: [
      .font: UIFont.systemFont(ofSize: 22, weight: .bold),
      .foregroundColor: UIColor(hex: "#1A1A1A"),
      .kern: 0.3
    ]))
    let subPara = NSMutableParagraphStyle()
    subPara.paragraphSpacingBefore = 6
    slogan.append(NSAttributedString(string: "AI 驱动的英语学习助手", attributes: [
      .font: UIFont.systemFont(ofSize: 14),  // 加大: 13 → 14
      .foregroundColor: UIColor(hex: "#666666"),  // 加深: #999 → #666 提升存在感
      .kern: 0.4,
      .paragraphStyle: subPara
    ]))
    model.sloganText = slogan
    model.sloganIsHidden = false

    // ===== 号码栏（与 fallback UI maskedPhone 30sp 对齐）=====
    model.numberColor = UIColor(hex: "#1A1A1A")
    model.numberFont = UIFont.systemFont(ofSize: 30, weight: .semibold)

    // ===== 一键登录按钮（位置上移给分割线+微信按钮腾空间）=====
    model.loginBtnBgImgs = [
      UIImage.from(color: primary),
      UIImage.from(color: primary.withAlphaComponent(0.85)),
      UIImage.from(color: UIColor(hex: "#D4D4D4"))
    ]
    model.loginBtnText = NSAttributedString(string: "本机号码一键登录", attributes: [
      .font: UIFont.systemFont(ofSize: 16, weight: .semibold),
      .foregroundColor: UIColor.white
    ])
    // 主按钮底距底 209pt（与 Android LOGBTN_OFFSET_Y_B_DP 一致；位置上移给协议让出上方位置）
    model.loginBtnFrameBlock = { (_, superViewSize, _) -> CGRect in
      let height: CGFloat = 50
      let width = superViewSize.width - 56  // 左右各 28pt margin
      return CGRect(
        x: 28,
        y: superViewSize.height - 209 - height,
        width: width,
        height: height
      )
    }
    // 协议区底距底 275pt — 钉到主按钮上方 16pt 处（参考 PhoneLoginForm 协议在登录按钮上方）
    model.privacyFrameBlock = { (_, superViewSize, frame) -> CGRect in
      // frame.size 是 SDK 计算的协议区原始大小（高度随多行变化），保留宽高，只改 origin
      return CGRect(
        x: (superViewSize.width - frame.size.width) / 2,
        y: superViewSize.height - 275 - frame.size.height,
        width: frame.size.width,
        height: frame.size.height
      )
    }

    // ===== 协议区 =====
    model.checkBoxIsChecked = false  // 默认未勾选（合规）
    model.uncheckedImg = UIImage(systemName: "circle")
    model.checkedImg = UIImage(systemName: "checkmark.circle.fill")?
      .withTintColor(primary, renderingMode: .alwaysOriginal)
    model.privacyTextFontSize = 12
    model.privacyColors = [UIColor(hex: "#999999"), primary]
    // 协议名自带书名号（iOS PNVS 仅对运营商协议自动套《》，自定义 privacy 需手动加）
    model.privacyOne = ["《用户服务协议》", "https://littlegrape.coderhythm.cn/terms"]
    model.privacyTwo = ["《隐私政策》", "https://littlegrape.coderhythm.cn/privacy"]
    model.privacyPreText = "已阅读并同意"

    // ===== 隐藏默认的"切换其他方式"，用自定义微信按钮替代 =====
    model.changeBtnIsHidden = true

    // ===== 分割线 + 微信登录胶囊按钮（参考 PhoneLoginForm dividerContainer + wechatButton）=====
    // 布局（自下而上，与 Android 距底坐标系一致）：
    //   微信按钮  distFromBottom = 76pt  (高 50, top = h - 126)
    //   分割线    distFromBottom = 146pt (高 20, top = h - 166)
    //   (~60pt 大留白)
    //   主按钮    distFromBottom = 209pt（由 loginBtnFrameBlock 设置）
    //   协议      distFromBottom = 275pt（由 privacyFrameBlock 设置，钉主按钮上方）
    model.customViewBlock = { [weak self] customAreaView in
      guard let self = self, let customAreaView = customAreaView else { return }
      let bounds = customAreaView.bounds
      let sideMargin: CGFloat = 28

      // ---- 分割线 ----
      let dividerWrap = UIView(frame: CGRect(
        x: sideMargin,
        y: bounds.height - 166,
        width: bounds.width - sideMargin * 2,
        height: 20
      ))
      dividerWrap.autoresizingMask = [.flexibleWidth, .flexibleTopMargin]

      let dividerText = UILabel()
      dividerText.text = "或使用以下方式继续"  // 与 zh-CN.json auth.login.orContinueWith 一致
      dividerText.font = UIFont.systemFont(ofSize: 12)
      dividerText.textColor = UIColor(hex: "#999999")
      dividerText.textAlignment = .center
      dividerText.sizeToFit()

      let textW = dividerText.frame.width + 24  // 文字左右各 12pt margin
      let textX = (dividerWrap.frame.width - textW) / 2
      dividerText.frame = CGRect(x: textX + 12, y: 0, width: textW - 24, height: 20)

      let lineLeft = UIView(frame: CGRect(x: 0, y: 9.5, width: textX, height: 1))
      lineLeft.backgroundColor = UIColor(hex: "#E5E5EA")
      let lineRight = UIView(frame: CGRect(
        x: textX + textW,
        y: 9.5,
        width: dividerWrap.frame.width - (textX + textW),
        height: 1
      ))
      lineRight.backgroundColor = UIColor(hex: "#E5E5EA")

      dividerWrap.addSubview(lineLeft)
      dividerWrap.addSubview(lineRight)
      dividerWrap.addSubview(dividerText)
      customAreaView.addSubview(dividerWrap)

      // ---- 微信登录按钮（白底胶囊）----
      let wechatButton = UIButton(type: .system)
      wechatButton.frame = CGRect(
        x: sideMargin,
        y: bounds.height - 126,
        width: bounds.width - sideMargin * 2,
        height: 50
      )
      wechatButton.autoresizingMask = [.flexibleWidth, .flexibleTopMargin]
      wechatButton.backgroundColor = .white
      wechatButton.layer.cornerRadius = 25
      wechatButton.layer.borderWidth = 1
      wechatButton.layer.borderColor = UIColor(hex: "#E5E5EA").cgColor
      wechatButton.setTitle("微信登录", for: .normal)
      wechatButton.setTitleColor(UIColor(hex: "#1A1A1A"), for: .normal)
      wechatButton.titleLabel?.font = UIFont.systemFont(ofSize: 16)
      // SF Symbols 没有微信图标 — 用绿色圆点装饰表达"微信"，避免依赖额外 asset
      // 设计参考"按钮前缀小色点"模式（Slack/Discord 用过）
      let attachment = NSTextAttachment()
      attachment.image = AliyunPNVSModule.makeDotImage(color: UIColor(hex: "#07C160"), diameter: 10)
      attachment.bounds = CGRect(x: 0, y: -1, width: 10, height: 10)
      let attrTitle = NSMutableAttributedString(attachment: attachment)
      attrTitle.append(NSAttributedString(string: "  微信登录", attributes: [
        .font: UIFont.systemFont(ofSize: 16),
        .foregroundColor: UIColor(hex: "#1A1A1A")
      ]))
      wechatButton.setAttributedTitle(attrTitle, for: .normal)

      wechatButton.addTarget(self, action: #selector(self.handleSwitchTap), for: .touchUpInside)
      customAreaView.addSubview(wechatButton)
    }

    return model
  }

  /// 生成单色圆点 image（用于按钮 title 前的装饰）
  fileprivate static func makeDotImage(color: UIColor, diameter: CGFloat) -> UIImage {
    let size = CGSize(width: diameter, height: diameter)
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    defer { UIGraphicsEndImageContext() }
    color.setFill()
    UIBezierPath(ovalIn: CGRect(origin: .zero, size: size)).fill()
    return UIGraphicsGetImageFromCurrentImageContext() ?? UIImage()
  }

  @objc private func handleSwitchTap() {
    if !isProtocolChecked {
      // 与 PNVS 主按钮未勾协议时的提示风格保持一致
      guard let top = AliyunPNVSModule.topViewController() else { return }
      let alert = UIAlertController(
        title: nil,
        message: "请阅读并同意协议",
        preferredStyle: .alert
      )
      alert.addAction(UIAlertAction(title: "我知道了", style: .default))
      top.present(alert, animated: true)
      return
    }
    TXCommonHandler.sharedInstance().cancelLoginVCAnimated(true) { [weak self] in
      self?.sendEvent("PNVS_SwitchToWechat", [:])
    }
  }
}

// ============== UI helpers ==============

extension UIColor {
  convenience init(hex: String) {
    var hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if hex.hasPrefix("#") { hex.removeFirst() }
    var rgb: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&rgb)
    let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
    let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
    let b = CGFloat(rgb & 0x0000FF) / 255.0
    self.init(red: r, green: g, blue: b, alpha: 1.0)
  }
}

extension UIImage {
  static func from(color: UIColor, size: CGSize = CGSize(width: 1, height: 1)) -> UIImage {
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    color.setFill()
    UIRectFill(CGRect(origin: .zero, size: size))
    let img = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()
    return img ?? UIImage()
  }
}
