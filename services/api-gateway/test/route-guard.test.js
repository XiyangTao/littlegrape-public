const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000'; // API Gateway端口
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'test123456';

// 存储测试用的token和用户信息
let testUser = null;
let accessToken = null;

// 创建axios实例
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
  validateStatus: () => true // 允许所有状态码，不抛出异常
});

/**
 * 测试工具函数
 */
function logTest(title, status, details) {
  const statusSymbol = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${statusSymbol} ${title}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function expectStatus(actual, expected, testName) {
  if (actual === expected) {
    logTest(testName, 'PASS', `状态码: ${actual}`);
    return true;
  } else {
    logTest(testName, 'FAIL', `期望状态码: ${expected}, 实际: ${actual}`);
    return false;
  }
}

/**
 * 准备测试数据 - 注册用户并获取token
 */
async function setupTestData() {
  console.log('\n🔧 准备测试数据...\n');

  try {
    // 1. 清理可能存在的测试数据
    await api.delete('/api/test/user/cleanup', {
      data: { emails: [TEST_EMAIL] }
    });

    // 2. 注册测试用户
    const registerResponse = await api.post('/api/auth/register/email', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      username: 'testuser',
      nickname: '测试用户'
    });

    if (registerResponse.status === 201) {
      testUser = registerResponse.data.data.user;
      accessToken = registerResponse.data.data.tokens.accessToken;
      logTest('用户注册', 'PASS', `用户ID: ${testUser.id}`);
      return true;
    } else {
      logTest('用户注册', 'FAIL', `状态码: ${registerResponse.status}`);
      return false;
    }
  } catch (error) {
    logTest('准备测试数据', 'FAIL', error.message);
    return false;
  }
}

/**
 * 测试 PUBLIC 策略
 * 应该无需认证即可访问
 */
async function testPublicStrategy() {
  console.log('\n🌍 测试 PUBLIC 策略...\n');

  const tests = [
    {
      name: 'GET /health - 健康检查',
      request: () => api.get('/health'),
      expectedStatus: 200
    },
    {
      name: 'POST /api/auth/register/email - 用户注册',
      request: () => api.post('/api/auth/register/email', {
        email: 'public-test@example.com',
        password: 'test123456',
        username: 'publictest'
      }),
      expectedStatus: 201
    },
    {
      name: 'POST /api/auth/login/email - 用户登录',
      request: () => api.post('/api/auth/login/email', {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }),
      expectedStatus: 200
    },
    {
      name: 'GET /api/user/check/username/testusername - 用户名检查',
      request: () => api.get('/api/user/check/username/testusername'),
      expectedStatus: 200
    },
    {
      name: 'POST /api/auth/token/verify - Token验证',
      request: () => api.post('/api/auth/token/verify', {
        token: accessToken
      }),
      expectedStatus: 200
    }
  ];

  let passCount = 0;
  for (const test of tests) {
    try {
      const response = await test.request();
      if (expectStatus(response.status, test.expectedStatus, test.name)) {
        passCount++;
      }
    } catch (error) {
      logTest(test.name, 'FAIL', `请求失败: ${error.message}`);
    }
  }

  console.log(`\nPUBLIC 策略测试结果: ${passCount}/${tests.length} 通过\n`);
  return passCount === tests.length;
}

/**
 * 测试 OPTIONAL 策略
 * 应该无认证和有认证都能访问，但返回内容不同
 */
async function testOptionalStrategy() {
  console.log('\n🔓 测试 OPTIONAL 策略...\n');

  const testPath = `/api/user/${testUser.id}/profile`;

  try {
    // 1. 无认证访问
    const unauthResponse = await api.get(testPath);
    const hasUnauthAccess = expectStatus(unauthResponse.status, 200, '未登录访问他人资料');

    if (hasUnauthAccess) {
      const unauthData = unauthResponse.data.data;
      logTest('返回基础信息', unauthData.viewerContext?.isLoggedIn === false ? 'PASS' : 'FAIL',
        `isLoggedIn: ${unauthData.viewerContext?.isLoggedIn}`);
    }

    // 2. 有认证访问
    const authResponse = await api.get(testPath, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const hasAuthAccess = expectStatus(authResponse.status, 200, '登录后访问他人资料');

    if (hasAuthAccess) {
      const authData = authResponse.data.data;
      logTest('返回增强信息', authData.viewerContext?.isLoggedIn === true ? 'PASS' : 'FAIL',
        `isLoggedIn: ${authData.viewerContext?.isLoggedIn}`);
      logTest('包含所有权信息', authData.user?.isOwnProfile !== undefined ? 'PASS' : 'FAIL',
        `isOwnProfile: ${authData.user?.isOwnProfile}`);
    }

    const bothPass = hasUnauthAccess && hasAuthAccess;
    console.log(`\nOPTIONAL 策略测试结果: ${bothPass ? '✅ 通过' : '❌ 失败'}\n`);
    return bothPass;

  } catch (error) {
    logTest('OPTIONAL 策略测试', 'FAIL', error.message);
    return false;
  }
}

/**
 * 测试 REQUIRED 策略
 * 应该无认证时返回401，有认证时正常访问
 */
async function testRequiredStrategy() {
  console.log('\n🔒 测试 REQUIRED 策略...\n');

  const tests = [
    {
      name: 'GET /api/user/profile - 获取个人资料',
      path: '/api/user/profile',
      method: 'get'
    },
    {
      name: 'PUT /api/user/profile - 更新个人资料',
      path: '/api/user/profile',
      method: 'put',
      data: { nickname: '更新的昵称' }
    }
  ];

  let passCount = 0;
  const totalTests = tests.length * 2; // 每个接口测试无认证和有认证两种情况

  for (const test of tests) {
    try {
      // 1. 无认证访问 - 应该返回401
      const unauthResponse = test.method === 'get'
        ? await api.get(test.path)  // GET: 只传path
        : await api[test.method](test.path, test.data);  // PUT: path + data

      if (expectStatus(unauthResponse.status, 401, `${test.name} (无认证)`)) {
        passCount++;
      }

      // 2. 有认证访问 - 应该返回200
      const authResponse = test.method === 'get'
        ? await api.get(test.path, { headers: { Authorization: `Bearer ${accessToken}` } })  // GET: path + config
        : await api[test.method](test.path, test.data, { headers: { Authorization: `Bearer ${accessToken}` } });  // PUT: path + data + config

      if (expectStatus(authResponse.status, 200, `${test.name} (有认证)`)) {
        passCount++;
      }

    } catch (error) {
      logTest(`${test.name} 测试`, 'FAIL', error.message);
    }
  }

  console.log(`\nREQUIRED 策略测试结果: ${passCount}/${totalTests} 通过\n`);
  return passCount === totalTests;
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  console.log('\n🧹 清理测试数据...\n');

  try {
    const response = await api.delete('/api/auth/test/cleanup', {
      data: {
        emails: [TEST_EMAIL, 'public-test@example.com']
      }
    });

    if (response.status === 200) {
      logTest('清理测试数据', 'PASS', `删除了 ${response.data.data?.deletedCount || 0} 个用户`);
    } else {
      logTest('清理测试数据', 'FAIL', `状态码: ${response.status}`);
    }
  } catch (error) {
    logTest('清理测试数据', 'FAIL', error.message);
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始路由守卫测试\n');
  console.log('=' .repeat(50));

  try {
    // 1. 准备测试数据
    const setupSuccess = await setupTestData();
    if (!setupSuccess) {
      console.log('❌ 测试数据准备失败，终止测试');
      return;
    }

    // 2. 测试各种策略
    const publicResult = await testPublicStrategy();
    const optionalResult = await testOptionalStrategy();
    const requiredResult = await testRequiredStrategy();

    // 3. 清理测试数据
    await cleanupTestData();

    // 4. 输出总结
    console.log('=' .repeat(50));
    console.log('\n📊 测试总结:');
    console.log(`PUBLIC 策略:   ${publicResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`OPTIONAL 策略: ${optionalResult ? '✅ 通过' : '❌ 失败'}`);
    console.log(`REQUIRED 策略: ${requiredResult ? '✅ 通过' : '❌ 失败'}`);

    const allPassed = publicResult && optionalResult && requiredResult;
    console.log(`\n总体结果: ${allPassed ? '🎉 所有测试通过' : '💥 部分测试失败'}\n`);

    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests();
}

module.exports = { runTests };