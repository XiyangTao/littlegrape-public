package cn.coderhythm.aliyunpnvs

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.mobile.auth.gatewayauth.AuthRegisterViewConfig
import com.mobile.auth.gatewayauth.AuthUIConfig
import com.mobile.auth.gatewayauth.AuthUIControlClickListener
import com.mobile.auth.gatewayauth.CustomInterface
import com.mobile.auth.gatewayauth.PhoneNumberAuthHelper
import com.mobile.auth.gatewayauth.PreLoginResultListener
import com.mobile.auth.gatewayauth.ResultCode
import com.mobile.auth.gatewayauth.TokenResultListener
import com.mobile.auth.gatewayauth.model.TokenRet
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

class AliyunPNVSModule : Module() {

  private var helper: PhoneNumberAuthHelper? = null

  // getLoginToken 是异步通过 TokenResultListener 全局回调返回结果，
  // 所以用 AtomicReference 把当前 promise 路由进 listener。
  private val pendingLoginPromise = AtomicReference<Promise?>(null)

  // PNVS 协议 checkbox 当前状态 — 通过 setUIClickListener 监听 ACTION_CHECKBOX 事件维护
  // 自定义微信按钮点击时读这个值做合规校验：未勾选不允许切换登录方式
  private val isProtocolChecked = AtomicBoolean(false)

  // 未勾协议时的统一提示文案 — 主按钮 toast + 微信按钮 toast 共用，避免分裂
  // 文案不指方位（协议在按钮上方），通用措辞
  private val PROTOCOL_NOT_AGREED_MSG = "请阅读并同意协议"

  override fun definition() = ModuleDefinition {
    Name("AliyunPNVS")

    // 授权页内底部按钮事件，RN 监听后切换到自有微信登录流程
    Events("PNVS_SwitchToWechat")

    AsyncFunction("setAuthSDKInfo") { secret: String, promise: Promise ->
      val ctx = appContext.reactContext ?: run {
        promise.reject("E_NO_CONTEXT", "no context", null); return@AsyncFunction
      }

      val routerListener = object : TokenResultListener {
        override fun onTokenSuccess(s: String?) {
          val current = pendingLoginPromise.get() ?: return
          val ret = parseTokenRet(s) ?: return
          when (ret.code) {
            ResultCode.CODE_START_AUTHPAGE_SUCCESS -> {
              // 授权页弹出成功，等待用户操作（不 settle promise）
            }
            ResultCode.CODE_SUCCESS -> {
              if (pendingLoginPromise.compareAndSet(current, null)) {
                helper?.quitLoginPage()
                current.resolve(ret.token ?: "")
              }
            }
            else -> {
              if (pendingLoginPromise.compareAndSet(current, null)) {
                helper?.quitLoginPage()
                current.reject("E_GET_TOKEN", "${ret.code}: ${ret.msg}", null)
              }
            }
          }
        }

        override fun onTokenFailed(s: String?) {
          val current = pendingLoginPromise.getAndSet(null) ?: return
          val ret = parseTokenRet(s)
          val code = ret?.code ?: "UNKNOWN"
          val isCancel = code == ResultCode.CODE_ERROR_USER_CANCEL ||
            code == ResultCode.CODE_ERROR_USER_SWITCH
          helper?.quitLoginPage()
          if (isCancel) {
            current.reject("USER_CANCELLED", "用户已取消", null)
          } else {
            current.reject(mapErrorCode(code), "${code}: ${ret?.msg ?: ""}", null)
          }
        }
      }

      val h = PhoneNumberAuthHelper.getInstance(ctx, routerListener)
      h.getReporter().setLoggerEnable(true) // dev 期间启用，方便排查 600002 等错误
      h.setAuthSDKInfo(secret)
      // UI 控件点击事件路由：
      //   700003 (CHECKBOX) — 同步协议勾选状态，给自定义微信按钮做合规校验
      //   700002 (LOGIN_BTN) — 用户点主按钮；未勾协议时自己弹 toast（避开 PNVS 默认
      //     的"请同意服务条款"文案，与微信按钮的 toast 保持一致）
      h.setUIClickListener(AuthUIControlClickListener { code, _, jsonString ->
        when (code) {
          ResultCode.CODE_ERROR_USER_CHECKBOX -> {
            val checked = try {
              JSONObject(jsonString ?: "{}").optBoolean("isChecked", false)
            } catch (_: Exception) { false }
            isProtocolChecked.set(checked)
          }
          ResultCode.CODE_ERROR_USER_LOGIN_BTN -> {
            if (!isProtocolChecked.get()) {
              Toast.makeText(ctx, PROTOCOL_NOT_AGREED_MSG, Toast.LENGTH_SHORT).show()
            }
          }
        }
      })
      helper = h
      promise.resolve(true)
    }

    AsyncFunction("checkEnvAvailable") { promise: Promise ->
      val h = helper ?: run { promise.resolve(false); return@AsyncFunction }
      val available = h.checkEnvAvailable()
      promise.resolve(available)
    }

    AsyncFunction("preLogin") { timeoutMs: Double, promise: Promise ->
      val h = helper ?: run {
        promise.reject("E_NOT_INITIALIZED", "call setAuthSDKInfo first", null); return@AsyncFunction
      }
      h.accelerateLoginPage((timeoutMs).toInt(), object : PreLoginResultListener {
        override fun onTokenSuccess(vendor: String?) {
          val carrier = mapVendor(vendor)
          // Android 预取号阶段不返回掩码号（SDK 接口签名限制 — 掩码号只在授权页内显示）
          promise.resolve(mapOf(
            "maskedPhone" to "",
            "carrier" to carrier
          ))
        }
        override fun onTokenFailed(vendor: String?, msg: String?) {
          promise.reject("PRE_LOGIN_FAILED", "${vendor}: ${msg}", null)
        }
      })
    }

    AsyncFunction("getLoginToken") { timeoutMs: Double, theme: Map<String, Any>?, promise: Promise ->
      val h = helper ?: run {
        promise.reject("E_NOT_INITIALIZED", "call setAuthSDKInfo first", null); return@AsyncFunction
      }
      val ctx = currentActivity() ?: appContext.reactContext ?: run {
        promise.reject("E_NO_CONTEXT", "no activity context", null); return@AsyncFunction
      }

      // 替换之前可能未结束的 promise（保护性）
      pendingLoginPromise.getAndSet(promise)?.reject("E_REPLACED", "新请求覆盖旧请求", null)

      // 每次拉起授权页时 PNVS checkbox 默认未勾选，重置缓存状态
      isProtocolChecked.set(false)

      // 应用自定义 UI（葡萄紫主题）
      h.removeAuthRegisterViewConfig()
      h.removeAuthRegisterXmlConfig()
      h.setAuthUIConfig(buildAuthUIConfig(theme ?: emptyMap()))

      // 注入五个自定义 view（logo 卡片、标题副标题、运营商标识、分割线、微信按钮）
      h.addAuthRegistViewConfig("littlegrape_logo_card", buildLogoViewConfig())
      h.addAuthRegistViewConfig("littlegrape_title", buildTitleViewConfig())
      h.addAuthRegistViewConfig("littlegrape_vendor", buildVendorViewConfig(h))
      h.addAuthRegistViewConfig("littlegrape_divider", buildDividerViewConfig())
      h.addAuthRegistViewConfig("littlegrape_wechat_btn", buildWechatButtonConfig())

      h.getLoginToken(ctx, (timeoutMs).toInt())
    }

    AsyncFunction("dismissLoginPage") { promise: Promise ->
      helper?.quitLoginPage()
      pendingLoginPromise.getAndSet(null)?.reject("USER_CANCELLED", "已关闭", null)
      promise.resolve(null)
    }
  }

  // ============ Helpers ============

  private fun currentActivity(): Activity? = appContext.activityProvider?.currentActivity

  private data class TokenRetParsed(val code: String, val token: String?, val msg: String?)

  private fun parseTokenRet(json: String?): TokenRetParsed? {
    if (json.isNullOrEmpty()) return null
    return try {
      val ret = TokenRet.fromJson(json)
      TokenRetParsed(ret.code ?: "UNKNOWN", ret.token, ret.msg)
    } catch (e: Exception) {
      try {
        val obj = JSONObject(json)
        TokenRetParsed(
          obj.optString("code", "UNKNOWN"),
          obj.optString("token", null),
          obj.optString("msg", null)
        )
      } catch (_: Exception) { null }
    }
  }

  private fun mapVendor(vendor: String?): String = when (vendor?.uppercase()) {
    "CMCC" -> "CMCC"
    "CUCC" -> "CUCC"
    "CTCC" -> "CTCC"
    else -> "CMCC"
  }

  private fun mapErrorCode(code: String): String = when (code) {
    ResultCode.CODE_ERROR_USER_CANCEL, ResultCode.CODE_ERROR_USER_SWITCH -> "USER_CANCELLED"
    ResultCode.CODE_ERROR_NO_SIM_FAIL -> "NO_SIM"
    ResultCode.CODE_ERROR_NO_MOBILE_NETWORK_FAIL, ResultCode.CODE_ERROR_NETWORK -> "NETWORK_UNAVAILABLE"
    ResultCode.CODE_GET_TOKEN_FAIL -> "AUTH_FAILED"
    else -> "E_GET_TOKEN"
  }

  // ==================== UI 配置 ====================

  // ==================== 布局常量（基准设计稿 375 × 667 dp）====================
  // 业界标准：所有 Y 轴位置 × ratio (currentScreenHeightDp / 667) 实现自适应
  // 参考：极光 JVerify 官方文档 + 阿里云 PNVS Demo
  private val DESIGN_HEIGHT_DP = 667
  private val MIN_RATIO = 0.85f   // 极小屏幕下限（iPhone 5s 568dp 约 0.85）
  private val MAX_RATIO = 1.30f   // 极大屏幕上限（iPad / 折叠屏内屏 约 1.5+）

  // 设计稿基准位置（375x667 视觉稿）— 与 fallback UI styles.ts/createCarrierStyles 对齐
  private val LOGO_OFFSET_Y_DP = 80          // logo 顶部 80dp（屏高 12%）
  private val LOGO_SIZE_DP = 72              // 与 fallback UI logoWrap 一致（72dp 圆角20）
  private val LOGO_SHADOW_PADDING_DP = 18    // 阴影外扩需要的容器内边距（避免被 clip）
  private val TITLE_BLOCK_OFFSET_Y_DP = 170  // logo 72 → 标题区上移
  private val TITLE_BLOCK_HEIGHT_DP = 64     // 标题22sp + 间距6 + 副标题13sp ≈ 64dp
  private val NUMBER_OFFSET_Y_DP = 240       // 号码区上移 40dp（缓解副标题↔号码大留白）
  private val NUMBER_HEIGHT_DP = 40
  private val VENDOR_OFFSET_Y_DP = 296       // 运营商 chip（号码底 + 16dp 间距）
  // 距底部位置 — 参考 PhoneLoginForm 布局：协议在主按钮上方，分割线 + 微信按钮在
  // 主按钮下方有大留白。自下而上的视觉顺序：微信按钮 → 分割线 → (大留白) → 主按钮 → 协议
  private val LOGBTN_OFFSET_Y_B_DP = 209     // 主按钮底距底（屏中偏下，给协议让出上方位置）
  private val PRIVACY_OFFSET_Y_B_DP = 275    // 协议底距底（主按钮上方 16dp 处，与按钮紧贴）
  private val DIVIDER_OFFSET_Y_B_DP = 146    // 分割线底距底（主按钮下方 ~60dp 大留白）
  private val DIVIDER_HEIGHT_DP = 20
  private val WECHAT_BTN_HEIGHT_DP = 50
  private val WECHAT_OFFSET_Y_B_DP = 76      // 微信按钮底距底（距分割线 20dp）

  /** 屏高 / 设计稿高度 比例（限幅避免极端机型崩坏） */
  private fun ratio(): Float {
    val ctx = appContext.reactContext ?: return 1f
    val dm = ctx.resources.displayMetrics
    val screenHeightDp = dm.heightPixels / dm.density
    return (screenHeightDp / DESIGN_HEIGHT_DP).coerceIn(MIN_RATIO, MAX_RATIO)
  }

  /** 把设计稿 Y 轴 dp 按当前屏幕高度比例缩放（业界标准） */
  private fun adaptY(designDp: Int): Int = (designDp * ratio()).toInt()

  private fun buildAuthUIConfig(theme: Map<String, Any>): AuthUIConfig {
    val themeColorHex = (theme["themeColor"] as? String) ?: "#7C5CFC"
    val primary = parseColorOrFallback(themeColorHex, "#7C5CFC")

    return AuthUIConfig.Builder()
      // ===== 状态栏 / 导航栏 =====
      .setStatusBarColor(Color.WHITE)
      .setLightColor(true)
      .setNavColor(Color.WHITE)
      .setNavText("") // nav 标题留空，标题用自定义 view 大字渲染
      .setNavTextColor(Color.parseColor("#1A1A1A"))
      .setNavReturnImgPath("authsdk_return_bg")
      .setNavReturnHidden(false)
      // 协议页 WebView nav：白底 + 黑字（不要紫色）+ 返回按钮
      // 注意：SDK 不会把 navReturnImgPath 自动复用到 WebView，必须显式设 webNavReturnImgPath，
      //       否则用户在协议详情页只能按系统返回键。
      .setWebNavColor(Color.WHITE)
      .setWebNavTextColor(Color.parseColor("#1A1A1A"))
      .setWebNavTextSize(16)
      .setWebNavReturnImgPath("authsdk_return_bg")

      // ===== Logo 隐藏 — 用自定义 view 注入（PNVS 默认 LogoImg 无法挂 elevation 阴影）=====
      .setLogoHidden(true)

      // ===== Slogan 关掉，全部用自定义 view（PNVS 的 slogan 区会被 vendor 信息覆盖，不可控）=====
      .setSloganHidden(true)

      // ===== 号码栏（138****8888，PNVS 自动渲染）— 字号与 fallback UI maskedPhone 对齐 =====
      .setNumberColor(Color.parseColor("#1A1A1A"))
      .setNumberSize(30)
      .setNumFieldOffsetY(adaptY(NUMBER_OFFSET_Y_DP))

      // ===== 一键登录按钮（葡萄紫渐变，距底部）=====
      .setLogBtnText("本机号码一键登录")
      .setLogBtnTextColor(Color.WHITE)
      .setLogBtnTextSize(16)
      .setLogBtnBackgroundPath("authsdk_btn_bg")
      .setLogBtnHeight(50)
      .setLogBtnMarginLeftAndRight(28)
      .setLogBtnOffsetY_B(adaptY(LOGBTN_OFFSET_Y_B_DP))
      // 关掉 PNVS 默认"请同意服务条款"toast — 自己监听 LOGIN_BTN 事件弹统一文案
      .setLogBtnToastHidden(true)

      // ===== 隐藏 PNVS 默认"切换其他方式"，用自定义微信按钮替代 =====
      .setSwitchAccHidden(true)

      // ===== 协议区 =====
      // 协议名自带书名号（PNVS 仅对运营商协议 vendorPrivacy 自动套《》，appPrivacy 需手动加）
      .setAppPrivacyOne("《用户服务协议》", "https://littlegrape.coderhythm.cn/terms")
      .setAppPrivacyTwo("《隐私政策》", "https://littlegrape.coderhythm.cn/privacy")
      .setAppPrivacyColor(Color.parseColor("#999999"), primary)
      .setProtocolGravity(Gravity.START)
      .setPrivacyTextSize(12)
      .setPrivacyOffsetY_B(adaptY(PRIVACY_OFFSET_Y_B_DP))
      .setVendorPrivacyPrefix("《")
      .setVendorPrivacySuffix("》")
      .setPrivacyBefore("已阅读并同意")
      .setPrivacyEnd("")
      .setPrivacyState(false)  // 默认未勾选（合规）
      .setCheckboxHidden(false)
      .setUncheckedImgPath("authsdk_checkbox_uncheck")
      .setCheckedImgPath("authsdk_checkbox_check")

      .create()
  }

  /**
   * Logo 卡片：白底圆角 + 紫色 elevation 光晕（对齐 fallback UI styles.ts/logoWrap）。
   *
   * 为什么不用 PNVS 默认 setLogoImgPath：
   *   PNVS 内部 LogoImg 是直接贴 ImageView 的，外层不暴露，无法挂 Android elevation
   *   也无法设 outlineSpotShadowColor。要做带紫光阴影的卡片只能自定义 view 注入。
   *
   * 容器内边距 LOGO_SHADOW_PADDING_DP：elevation 阴影会向四周扩散，需要给外层
   * FrameLayout 留出 padding 空间 + 关掉 clip，否则阴影被 PNVS 内部布局裁掉。
   */
  private fun buildLogoViewConfig(): AuthRegisterViewConfig {
    val ctx = appContext.reactContext ?: throw IllegalStateException("no context")
    val padPx = dp(LOGO_SHADOW_PADDING_DP)

    val container = FrameLayout(ctx).apply {
      val lp = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(LOGO_SIZE_DP) + padPx * 2,
      )
      layoutParams = lp
      // y 上抬一个 padding，让卡片视觉位置仍是 LOGO_OFFSET_Y_DP
      y = (dp(adaptY(LOGO_OFFSET_Y_DP)) - padPx).toFloat()
      clipChildren = false
      clipToPadding = false
      setPadding(padPx, padPx, padPx, padPx)
    }

    val card = ImageView(ctx).apply {
      setImageResource(getResId("littlegrape_logo", "drawable"))
      setBackgroundResource(getResId("littlegrape_logo_card_bg", "drawable"))
      // 让 ImageView 的图像被 background 的圆角裁剪
      clipToOutline = true
      elevation = dp(8).toFloat()
      // API 28+ 才支持染色阴影；旧版本仍有黑色 elevation 阴影（可接受降级）
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        outlineSpotShadowColor = Color.parseColor("#7C5CFC")
        outlineAmbientShadowColor = Color.parseColor("#7C5CFC")
      }
      val lp = FrameLayout.LayoutParams(
        dp(LOGO_SIZE_DP),
        dp(LOGO_SIZE_DP),
      ).apply { gravity = Gravity.CENTER }
      layoutParams = lp
    }

    container.addView(card)

    return AuthRegisterViewConfig.Builder()
      .setView(container)
      .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
      .setCustomInterface(null)
      .build()
  }

  /** Logo 下方的 "欢迎使用小葡萄" + "AI 驱动的英语学习助手" 标题块（合并的垂直 LinearLayout） */
  private fun buildTitleViewConfig(): AuthRegisterViewConfig {
    val ctx = appContext.reactContext ?: throw IllegalStateException("no context")
    val container = LinearLayout(ctx).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      val lp = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(TITLE_BLOCK_HEIGHT_DP),
      )
      layoutParams = lp
      y = dp(adaptY(TITLE_BLOCK_OFFSET_Y_DP)).toFloat()
    }
    // 字号字距与 fallback UI styles.ts/createCarrierStyles.title/subtitle 对齐
    container.addView(TextView(ctx).apply {
      text = "欢迎使用小葡萄"
      setTextColor(Color.parseColor("#1A1A1A"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
      typeface = Typeface.DEFAULT_BOLD
      gravity = Gravity.CENTER
      letterSpacing = 0.014f  // 0.3px / 22sp ≈ 0.014em（fallback UI: letterSpacing 0.3）
    })
    container.addView(TextView(ctx).apply {
      text = "AI 驱动的英语学习助手"
      setTextColor(Color.parseColor("#666666"))  // 加深: #999 → #666 提升存在感
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)  // 加大: 13 → 14
      gravity = Gravity.CENTER
      letterSpacing = 0.029f  // 0.4px / 14sp ≈ 0.029em
      val lp = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply { topMargin = dp(6) }
      layoutParams = lp
    })
    return AuthRegisterViewConfig.Builder()
      .setView(container)
      .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
      .setCustomInterface(null)
      .build()
  }

  /**
   * 号码下方的运营商认证 chip — 浅紫色圆角背景 + 紫色文字 +"✓"前缀。
   * 替代纯文字"认证服务由X提供"，让运营商标识成为视觉资产，不再孤立。
   */
  private fun buildVendorViewConfig(h: PhoneNumberAuthHelper): AuthRegisterViewConfig {
    val ctx = appContext.reactContext ?: throw IllegalStateException("no context")
    val carrierName = mapVendorToDisplayName(h.currentCarrierName)

    // 外层容器水平居中，让 chip 自适应宽度
    val container = LinearLayout(ctx).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_HORIZONTAL
      layoutParams = ViewGroup.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(28),
      )
      y = dp(adaptY(VENDOR_OFFSET_Y_DP)).toFloat()
    }

    val chip = TextView(ctx).apply {
      text = "✓ 认证服务由${carrierName}提供"
      setTextColor(Color.parseColor("#7C5CFC"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
      // 浅紫色圆角背景（葡萄紫 alpha ~7%）
      background = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        setColor(Color.parseColor("#F4F0FE"))
        cornerRadius = dp(12).toFloat()
      }
      setPadding(dp(10), dp(4), dp(10), dp(4))
      layoutParams = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      )
    }
    container.addView(chip)

    return AuthRegisterViewConfig.Builder()
      .setView(container)
      .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
      .setCustomInterface(null)
      .build()
  }

  private fun mapVendorToDisplayName(vendor: String?): String = when (vendor?.uppercase()) {
    "CMCC" -> "中国移动"
    "CUCC" -> "中国联通"
    "CTCC" -> "中国电信"
    else -> "中国移动"
  }

  /**
   * 主按钮和微信按钮之间的分割线（横线 + 居中"或使用"文字 + 横线）
   * 参考 PhoneLoginForm.tsx 的 dividerContainer 样式，让"次要登录方式"有明确分隔。
   */
  private fun buildDividerViewConfig(): AuthRegisterViewConfig {
    val ctx = appContext.reactContext ?: throw IllegalStateException("no context")
    val screenHeight = ctx.resources.displayMetrics.heightPixels

    val container = LinearLayout(ctx).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      val lp = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(DIVIDER_HEIGHT_DP),
      ).apply {
        leftMargin = dp(28)
        rightMargin = dp(28)
      }
      layoutParams = lp
      // 容器底部距屏幕底 = adaptY(DIVIDER_OFFSET_Y_B_DP)，转 view top y 坐标
      val distFromBottomPx = dp(adaptY(DIVIDER_OFFSET_Y_B_DP) + DIVIDER_HEIGHT_DP)
      y = (screenHeight - distFromBottomPx).toFloat()
    }

    fun makeLine() = View(ctx).apply {
      setBackgroundColor(Color.parseColor("#E5E5EA"))
      val lp = LinearLayout.LayoutParams(0, dp(1), 1f)
      layoutParams = lp
    }

    val text = TextView(ctx).apply {
      text = "或使用以下方式继续"  // 与 zh-CN.json auth.login.orContinueWith 一致
      setTextColor(Color.parseColor("#999999"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
      val lp = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.WRAP_CONTENT,
        ViewGroup.LayoutParams.WRAP_CONTENT,
      ).apply {
        leftMargin = dp(12)
        rightMargin = dp(12)
      }
      layoutParams = lp
    }

    container.addView(makeLine())
    container.addView(text)
    container.addView(makeLine())

    return AuthRegisterViewConfig.Builder()
      .setView(container)
      .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
      .setCustomInterface(null)
      .build()
  }

  /**
   * 主按钮下方的微信登录按钮 — 白底胶囊 + 绿色微信 icon + 黑色文字。
   * 参考 PhoneLoginForm.tsx 的 wechatButton 样式（次按钮地位明确，不抢主按钮戏份）。
   *
   * 协议合规：点击前必须勾选 PNVS 协议 checkbox；未勾选 → Toast 阻断；
   *           已勾选 → 关闭授权页并 emit event，RN 端走微信登录流程。
   */
  private fun buildWechatButtonConfig(): AuthRegisterViewConfig {
    val ctx = appContext.reactContext ?: throw IllegalStateException("no context")
    val screenHeight = ctx.resources.displayMetrics.heightPixels

    val outer = LinearLayout(ctx).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER
      setBackgroundResource(getResId("littlegrape_wechat_btn_bg", "drawable"))
      val lp = LinearLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        dp(WECHAT_BTN_HEIGHT_DP),
      ).apply {
        leftMargin = dp(28)
        rightMargin = dp(28)
      }
      layoutParams = lp
      val distFromBottomPx = dp(adaptY(WECHAT_OFFSET_Y_B_DP) + WECHAT_BTN_HEIGHT_DP)
      y = (screenHeight - distFromBottomPx).toFloat()
    }

    val icon = ImageView(ctx).apply {
      setImageResource(getResId("littlegrape_wechat_icon", "drawable"))
      val lp = LinearLayout.LayoutParams(dp(22), dp(22)).apply {
        rightMargin = dp(8)
      }
      layoutParams = lp
    }

    val label = TextView(ctx).apply {
      text = "微信登录"
      setTextColor(Color.parseColor("#1A1A1A"))
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
      typeface = Typeface.create(Typeface.DEFAULT, Typeface.NORMAL)
    }

    outer.addView(icon)
    outer.addView(label)

    return AuthRegisterViewConfig.Builder()
      .setView(outer)
      .setRootViewId(AuthRegisterViewConfig.RootViewId.ROOT_VIEW_ID_BODY)
      .setCustomInterface(CustomInterface {
        if (!isProtocolChecked.get()) {
          // 与主按钮 toast 共用同一文案常量
          Toast.makeText(ctx, PROTOCOL_NOT_AGREED_MSG, Toast.LENGTH_SHORT).show()
          return@CustomInterface
        }
        helper?.quitLoginPage()
        pendingLoginPromise.getAndSet(null)?.reject("USER_CANCELLED", "切换到微信登录", null)
        sendEvent("PNVS_SwitchToWechat", emptyMap<String, Any>())
      })
      .build()
  }

  private fun getResId(name: String, type: String): Int {
    val ctx = appContext.reactContext ?: return 0
    return ctx.resources.getIdentifier(name, type, ctx.packageName)
  }

  // ==================== 工具 ====================

  private fun dp(value: Int): Int {
    val ctx = appContext.reactContext ?: return value
    val density = ctx.resources.displayMetrics.density
    return (value * density).toInt()
  }

  private fun parseColorOrFallback(hex: String, fallback: String): Int = try {
    Color.parseColor(hex)
  } catch (_: Exception) {
    Color.parseColor(fallback)
  }
}
