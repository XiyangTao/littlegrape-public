require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AliyunPNVS'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = 'MIT'
  s.author         = 'littlegrape'
  s.homepage       = 'https://littlegrape.cn'
  s.platforms      = { :ios => '15.1', :tvos => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # 阿里云号码认证 SDK（xcframeworks）
  s.vendored_frameworks = [
    'ATAuthSDK.xcframework',
    'YTXMonitor.xcframework',
    'YTXOperators.xcframework'
  ]

  # SDK 依赖系统库
  s.frameworks = 'CoreTelephony', 'Foundation', 'UIKit', 'CoreText', 'WebKit', 'SystemConfiguration', 'Security'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
    # 阿里云 SDK 用 OC 头，不写 modulemap，需要把头路径加入
    'OTHER_LDFLAGS' => '$(inherited) -ObjC'
  }

  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
