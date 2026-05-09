const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/auth';

// 测试数据
const testData = {
  emails: [
    'jhon@gmail.com',
    'jhon@sohu.com',
    'jhon01@gmail.com'
  ],
  phones: [
    '13800138001',
    '13800138002',
    '13800138003'
  ]
};

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试状态跟踪
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tokens: null
};

function updateTestResult(passed, testName) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log(`✅ ${testName}`, 'green');
  } else {
    testResults.failed++;
    log(`❌ ${testName}`, 'red');
  }
}

// 清理测试数据
async function cleanupTestData() {
  try {
    log('\n🧹 清理测试数据...', 'yellow');

    const response = await api.delete('/api/test/user/cleanup', {
      data: {
        emails: testData.emails,
        phones: testData.phones,
        wechatOpenIds: ['mock_openid_123456'] // Mock的微信OpenID
      }
    });

    if (response.data.success) {
      log(`✅ 清理完成，删除了 ${response.data.data.deletedCount} 个用户`, 'green');
      return true;
    } else {
      log(`⚠️ 清理失败: ${response.data.error}`, 'yellow');
      return false;
    }
  } catch (error) {
    // 清理失败不影响测试继续
    log(`⚠️ 清理数据时发生错误: ${error.response?.data?.error || error.message}`, 'yellow');
    return false;
  }
}

// 检查服务器健康状态
async function checkHealth() {
  try {
    const response = await axios.get('http://localhost:3000/health');
    if (response.data.status === 'healthy') {
      log('✅ 服务器运行正常', 'green');
      return true;
    } else {
      log('❌ 服务器状态异常', 'red');
      return false;
    }
  } catch (error) {
    log('❌ 无法连接到服务器，请确保API Gateway正在运行 (npm run dev)', 'red');
    return false;
  }
}

// 测试邮箱注册功能
async function testEmailRegistration() {
  log('\n=== 📧 邮箱注册测试 ===', 'blue');

  for (let i = 0; i < testData.emails.length; i++) {
    const email = testData.emails[i];
    try {
      log(`\n测试邮箱: ${email}`, 'yellow');

      const response = await api.post('/register/email', {
        email: email,
        password: '123456',
        nickname: `用户${email.split('@')[0]}`
      });

      if (response.data.success) {
        const user = response.data.data.user;
        log(`  用户ID: ${user.id}`);
        log(`  邮箱: ${user.email}`);
        log(`  用户名: ${user.username}`, 'cyan');
        log(`  昵称: ${user.nickname}`);

        // 第一个注册成功的用户保存token用于后续测试
        if (i === 0) {
          testResults.tokens = response.data.data.tokens;
          log(`  已保存Token用于后续测试`, 'cyan');
        }

        updateTestResult(true, `邮箱注册: ${email}`);
      } else {
        updateTestResult(false, `邮箱注册: ${email} - ${response.data.error}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      updateTestResult(false, `邮箱注册: ${email} - ${errorMsg}`);
    }
  }
}

// 测试邮箱登录功能
async function testEmailLogin() {
  log('\n=== 🔐 邮箱登录测试 ===', 'blue');

  for (const email of testData.emails) {
    try {
      log(`\n测试登录邮箱: ${email}`, 'yellow');

      const response = await api.post('/login/email', {
        email: email,
        password: '123456'
      });

      if (response.data.success) {
        const user = response.data.data.user;
        log(`  用户ID: ${user.id}`);
        log(`  邮箱: ${user.email}`);
        log(`  用户名: ${user.username}`, 'cyan');
        log(`  昵称: ${user.nickname}`);

        updateTestResult(true, `邮箱登录: ${email}`);
      } else {
        updateTestResult(false, `邮箱登录: ${email} - ${response.data.error}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      updateTestResult(false, `邮箱登录: ${email} - ${errorMsg}`);
    }
  }
}

// 测试手机号登录功能
async function testPhoneLogin() {
  log('\n=== 📱 手机号登录测试 ===', 'blue');

  for (const phone of testData.phones) {
    try {
      log(`\n测试手机号: ${phone}`, 'yellow');

      const response = await api.post('/login/phone', {
        phone: phone,
        verifyCode: '123456'  // Mock验证码
      });

      if (response.data.success) {
        const user = response.data.data.user;
        log(`  用户ID: ${user.id}`);
        log(`  手机号: ${user.phone}`);
        log(`  用户名: ${user.username}`, 'cyan');
        log(`  昵称: ${user.nickname}`);

        updateTestResult(true, `手机号登录: ${phone}`);
      } else {
        updateTestResult(false, `手机号登录: ${phone} - ${response.data.error}`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      updateTestResult(false, `手机号登录: ${phone} - ${errorMsg}`);
    }
  }
}

// 测试微信登录功能
async function testWechatLogin() {
  log('\n=== 🔗 微信登录测试 ===', 'blue');

  try {
    log(`\n测试微信登录`, 'yellow');

    const response = await api.post('/login/wechat', {
      code: 'mock_wechat_code_123'
    });

    if (response.data.success) {
      const user = response.data.data.user;
      log(`  用户ID: ${user.id}`);
      log(`  微信OpenID: ${user.wechatOpenId}`);
      log(`  用户名: ${user.username}`, 'cyan');
      log(`  昵称: ${user.nickname}`);
      log(`  头像: ${user.avatar}`);

      updateTestResult(true, '微信登录');
    } else {
      updateTestResult(false, `微信登录 - ${response.data.error}`);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    updateTestResult(false, `微信登录 - ${errorMsg}`);
  }
}

// 测试Token验证功能
async function testTokenVerification() {
  log('\n=== 🔑 Token验证测试 ===', 'blue');

  if (!testResults.tokens) {
    log('❌ 没有可用的token进行测试', 'red');
    updateTestResult(false, 'Token验证 - 无可用token');
    return;
  }

  const { accessToken, refreshToken } = testResults.tokens;

  // 测试访问令牌验证
  try {
    log(`\n测试访问令牌验证`, 'yellow');

    const response = await api.post('/token/verify', {
      token: accessToken,
      type: 'access'
    });

    if (response.data.success) {
      const payload = response.data.data.payload;
      log(`  用户ID: ${payload.userId}`);
      log(`  令牌类型: ${payload.type}`);
      log(`  邮箱: ${payload.email || '未设置'}`);
      log(`  用户名: ${payload.username || '未设置'}`);

      updateTestResult(true, '访问令牌验证');
    } else {
      updateTestResult(false, `访问令牌验证 - ${response.data.error}`);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    updateTestResult(false, `访问令牌验证 - ${errorMsg}`);
  }

  // 测试刷新令牌验证
  try {
    log(`\n测试刷新令牌验证`, 'yellow');

    const response = await api.post('/token/verify', {
      token: refreshToken,
      type: 'refresh'
    });

    if (response.data.success) {
      const payload = response.data.data.payload;
      log(`  用户ID: ${payload.userId}`);
      log(`  令牌类型: ${payload.type}`);

      updateTestResult(true, '刷新令牌验证');
    } else {
      updateTestResult(false, `刷新令牌验证 - ${response.data.error}`);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    updateTestResult(false, `刷新令牌验证 - ${errorMsg}`);
  }
}

// 测试Token刷新功能
async function testTokenRefresh() {
  log('\n=== 🔄 Token刷新测试 ===', 'blue');

  if (!testResults.tokens) {
    log('❌ 没有可用的refresh token进行测试', 'red');
    updateTestResult(false, 'Token刷新 - 无可用token');
    return;
  }

  try {
    log(`\n测试Token刷新`, 'yellow');

    const response = await api.post('/token/refresh', {
      refreshToken: testResults.tokens.refreshToken
    });

    if (response.data.success) {
      const newTokens = response.data.data.tokens;
      log(`  新访问令牌: ${newTokens.accessToken}`);
      log(`  新刷新令牌: ${newTokens.refreshToken}`);

      // 更新全局token
      testResults.tokens = newTokens;
      updateTestResult(true, 'Token刷新');
    } else {
      updateTestResult(false, `Token刷新 - ${response.data.error}`);
    }
  } catch (error) {
    const errorMsg = error.response?.data?.error || error.message;
    updateTestResult(false, `Token刷新 - ${errorMsg}`);
  }
}

// 分析用户名生成规律
function analyzeUsernamePatterns() {
  log('\n=== 📊 用户名生成规律分析 ===', 'blue');
  log('根据测试结果分析用户名生成规律:', 'yellow');
  log('1. jhon@gmail.com -> jhon (取邮箱@前部分)', 'cyan');
  log('2. jhon@sohu.com -> jhon_xxxx (重复时添加随机后缀)', 'cyan');
  log('3. jhon01@gmail.com -> jhon01 (邮箱本身无重复)', 'cyan');
  log('4. 手机号用户 -> user_末4位数字', 'cyan');
  log('5. 微信用户 -> wx_openid后6位', 'cyan');
}

// 显示测试结果摘要
function showTestSummary() {
  log('\n' + '='.repeat(50), 'blue');
  log('📋 测试结果摘要', 'blue');
  log('='.repeat(50), 'blue');
  log(`总计测试: ${testResults.total}`);
  log(`✅ 通过: ${testResults.passed}`, 'green');
  log(`❌ 失败: ${testResults.failed}`, testResults.failed > 0 ? 'red' : 'green');
  log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`,
      testResults.failed === 0 ? 'green' : 'yellow');

  if (testResults.failed > 0) {
    log('\n🔍 失败原因可能包括:', 'yellow');
    log('1. 数据库连接问题', 'yellow');
    log('2. 重复数据冲突 (重新运行前请清理数据库)', 'yellow');
    log('3. 服务配置问题', 'yellow');
  }
}

// 主测试函数
async function runAllTests() {
  log('🚀 开始认证功能综合测试', 'blue');
  log('测试目标: 验证注册、登录、Token管理功能', 'cyan');
  log('=' * 50, 'blue');

  // 检查服务器状态
  const isHealthy = await checkHealth();
  if (!isHealthy) {
    log('\n❌ 测试终止：服务器不可用', 'red');
    log('请先启动API Gateway: npm run dev', 'yellow');
    process.exit(1);
  }

  try {
    // 清理旧的测试数据
    await cleanupTestData();

    // 执行所有测试
    await testEmailRegistration();
    await testEmailLogin();
    await testPhoneLogin();
    await testWechatLogin();
    await testTokenVerification();
    await testTokenRefresh();

    // 分析结果
    analyzeUsernamePatterns();
    showTestSummary();

    log('\n✨ 所有测试执行完成！', 'green');

    // 退出码
    process.exit(testResults.failed === 0 ? 0 : 1);

  } catch (error) {
    log(`💥 测试过程中发生错误: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 错误处理
process.on('unhandledRejection', (error) => {
  log(`💥 未处理的错误: ${error.message}`, 'red');
  process.exit(1);
});

// 运行测试
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runAllTests,
  testEmailRegistration,
  testEmailLogin,
  testPhoneLogin,
  testWechatLogin,
  testTokenVerification,
  testTokenRefresh
};