# aliyun-pnvs

Expo native module wrapping Aliyun's PNVS (Phone Number Verification Service)
one-tap login SDK for iOS and Android.

## Module structure

| Path                       | What it is                                          |
| -------------------------- | --------------------------------------------------- |
| `src/index.ts`             | TypeScript surface exposed to JS                    |
| `expo-module.config.json`  | Expo module declaration                             |
| `plugin/`                  | Expo config plugin (links the native code)          |
| `ios/AliyunPNVSModule.swift` | iOS native implementation                         |
| `ios/AliyunPNVS.podspec`   | iOS pod definition                                  |
| `android/build.gradle`     | Android module build script                         |
| `android/src/.../AliyunPNVSModule.kt` | Android native implementation            |

## Third-party SDK binaries (not in this repo)

Aliyun's distribution license does not allow re-publishing the SDK binaries on
GitHub, so the following are **gitignored** and must be downloaded separately:

- `ios/ATAuthSDK.xcframework/`
- `ios/YTXOperators.xcframework/`
- `ios/YTXMonitor.xcframework/`
- `android/libs/`

Download from <https://help.aliyun.com/product/30090.html> (PNVS one-tap login,
中文：阿里云号码认证服务) and drop the unpacked frameworks / `.aar` into the
paths above. The wrapper code (`src/`, `plugin/`, `ios/AliyunPNVS*`,
`android/build.gradle`, `android/src/`) is what's actually mine — the binaries
are stock SDK assets.
