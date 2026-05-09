/**
 * Expo Config Plugin: 把 PNVS module 内 libs/m2/ 的本地 maven 仓库
 * 注入主 app 的 android/build.gradle，这样 :app 在传递性解析
 * cn.aliyun:pnvs/main/logger 等 aar 时能从本地仓库找到。
 *
 * 必须用 plugin 注入，不能直接在 module 的 build.gradle 声明，因为：
 *   Gradle 多模块项目里，module 内声明的 repositories 不会传递给依赖它的 :app。
 */
const { withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = '// aliyun-pnvs-local-maven';
const MAVEN_PATH = '$rootDir/../modules/aliyun-pnvs/android/libs/m2';

const withAliyunPnvsLocalMaven = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes(MARKER)) {
      return config;
    }
    const anchor = "maven { url 'https://www.jitpack.io' }";
    if (!config.modResults.contents.includes(anchor)) {
      throw new Error(
        '[aliyun-pnvs plugin] android/build.gradle 找不到 jitpack 锚点，无法注入本地 maven 仓库'
      );
    }
    const insertion = `${anchor}
    maven {
      url uri("${MAVEN_PATH}")
      metadataSources { artifact() }
    } ${MARKER}`;
    config.modResults.contents = config.modResults.contents.replace(anchor, insertion);
    return config;
  });
};

module.exports = withAliyunPnvsLocalMaven;
