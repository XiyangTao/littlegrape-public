import { Request, Response } from 'express';
import { SMSRateLimiter } from '../src/middleware/rateLimiter';
import { connectRedis, disconnectRedis } from '../src/config/redis';

// 测试用的手机号和设备ID
const TEST_PHONE = '13800138888';
const TEST_IP = '192.168.1.100';
const TEST_DEVICE_ID = 'test-device-12345';

// 创建模拟请求
function createTestRequest(phone: string, ip: string, deviceId?: string): Request {
  const headers: any = {
    'user-agent': 'Mozilla/5.0 Test Browser',
    'accept-language': 'zh-CN,zh;q=0.9',
    'accept-encoding': 'gzip, deflate, br',
    'x-forwarded-for': ip,
  };

  if (deviceId) {
    headers['x-device-id'] = deviceId;
  }

  return {
    headers,
    body: { phone },
    connection: { remoteAddress: ip },
    ip,
  } as Request;
}

function createTestResponse(): Response {
  let statusCode = 200;
  let responseData: any = null;
  const headers: { [key: string]: string } = {};

  const res = {
    status: function(code: number) {
      statusCode = code;
      return this;
    },
    json: function(data: any) {
      responseData = data;
      return this;
    },
    set: function(header: string, value: string) {
      headers[header] = value;
      return this;
    },
    _getStatus: () => statusCode,
    _getData: () => responseData,
    _getHeaders: () => headers,
  };

  return res as any;
}

// 等待指定时间
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRateLimiterRedis() {
  console.log('🧪 开始测试 Redis Rate Limiter 完整功能...\n');

  let rateLimiter: SMSRateLimiter | null = null;

  try {
    // 连接Redis
    console.log('🔌 连接Redis...');
    await connectRedis();
    console.log('✅ Redis连接成功\n');

    rateLimiter = new SMSRateLimiter();

    // 清理测试数据
    console.log('🧹 清理测试数据...');
    await rateLimiter.reset('ip', TEST_IP);
    await rateLimiter.reset('phone-hourly', TEST_PHONE);
    await rateLimiter.reset('phone-daily', TEST_PHONE);
    await rateLimiter.reset('device-hourly', TEST_DEVICE_ID);
    await rateLimiter.reset('device-daily', TEST_DEVICE_ID);
    console.log('✅ 测试数据清理完成\n');

    // 测试1: 正常请求通过
    console.log('📋 测试1: 正常请求应该通过');
    const req1 = createTestRequest(TEST_PHONE, TEST_IP, TEST_DEVICE_ID);
    const res1 = createTestResponse();
    let nextCalled = false;

    await rateLimiter.middleware()(req1, res1, () => { nextCalled = true; });

    if (nextCalled) {
      console.log('✅ 正常请求通过，next()被调用');
    } else {
      console.log('❌ 正常请求被拒绝');
    }

    // 检查限流状态
    const status1 = await rateLimiter.getStatus(TEST_IP, TEST_PHONE, TEST_DEVICE_ID);
    console.log('📊 当前限流状态:');
    console.log(`   IP剩余: ${status1.ip?.remainingPoints || 'N/A'}/30`);
    console.log(`   手机号小时剩余: ${status1.phoneHourly?.remainingPoints || 'N/A'}/5`);
    console.log(`   手机号日剩余: ${status1.phoneDaily?.remainingPoints || 'N/A'}/10`);
    console.log(`   设备小时剩余: ${status1.deviceHourly?.remainingPoints || 'N/A'}/10`);
    console.log(`   设备日剩余: ${status1.deviceDaily?.remainingPoints || 'N/A'}/20\n`);

    // 测试2: 手机号小时级限流 (5次)
    console.log('📋 测试2: 手机号小时级限流 (5次限制)');
    for (let i = 2; i <= 10; i++) {
      const req = createTestRequest(TEST_PHONE, `192.168.1.${100 + i}`, `device-${i}`);
      const res = createTestResponse();
      let nextCalled = false;

      await rateLimiter.middleware()(req, res, () => { nextCalled = true; });

      if (i <= 5) {
        console.log(`   第${i}次请求: ${nextCalled ? '通过' : '被拒绝'}`);
      } else {
        console.log(`   第${i}次请求: ${nextCalled ? '异常通过!' : '正确被拒绝'}`);
        if (!nextCalled && (res as any)._getStatus() === 429) {
          const data = (res as any)._getData();
          console.log(`   拒绝原因: ${data.error}`);
          console.log(`   重试时间: ${data.retryAfter}秒`);
        }
      }
    }


     // 检查限流状态
     const status2 = await rateLimiter.getStatus(TEST_IP, TEST_PHONE, TEST_DEVICE_ID);
     console.log('📊 当前限流状态:');
     console.log(`   IP剩余: ${status2.ip?.remainingPoints || 'N/A'}/30`);
     console.log(`   手机号小时剩余: ${status2.phoneHourly?.remainingPoints || 'N/A'}/5`);
     console.log(`   手机号日剩余: ${status2.phoneDaily?.remainingPoints || 'N/A'}/10`);
     console.log(`   设备小时剩余: ${status2.deviceHourly?.remainingPoints || 'N/A'}/10`);
     console.log(`   设备日剩余: ${status2.deviceDaily?.remainingPoints || 'N/A'}/20\n`);

    // 测试3: IP限流 (同一IP大量请求)
    console.log('\n📋 测试3: IP限流测试 (30次限制)');
    const testIp = '192.168.2.100';

    // 先重置IP限制
    await rateLimiter.reset('ip', testIp);

    let ipBlocked = false;
    for (let i = 1; i <= 32; i++) {
      const req = createTestRequest(`138000000${String(i).padStart(2, '0')}`, testIp, `device-ip-${i}`);
      const res = createTestResponse();
      let nextCalled = false;

      await rateLimiter.middleware()(req, res, () => { nextCalled = true; });

      if (i % 10 === 0 || i > 29) {
        console.log(`   第${i}次请求: ${nextCalled ? '通过' : '被拒绝'}`);
        if (!nextCalled && !ipBlocked) {
          ipBlocked = true;
          console.log(`   ✅ IP在第${i}次请求时被正确限流`);
        }
      }
    }

    // 测试4: 设备限流
    console.log('\n📋 测试4: 设备小时级限流测试 (10次限制)');
    const testDevice = 'test-device-limit';

    await rateLimiter.reset('device-hourly', testDevice);

    let deviceBlocked = false;
    for (let i = 1; i <= 12; i++) {
      const req = createTestRequest(`139000000${String(i).padStart(2, '0')}`, `192.168.3.${i}`, testDevice);
      const res = createTestResponse();
      let nextCalled = false;

      await rateLimiter.middleware()(req, res, () => { nextCalled = true; });

      if (i % 5 === 0 || i > 9) {
        console.log(`   第${i}次请求: ${nextCalled ? '通过' : '被拒绝'}`);
        if (!nextCalled && !deviceBlocked) {
          deviceBlocked = true;
          console.log(`   ✅ 设备在第${i}次请求时被正确限流`);
        }
      }
    }

    // 测试5: 限流重置功能
    console.log('\n📋 测试5: 限流重置功能');

    // 重置手机号限制
    await rateLimiter.reset('phone-hourly', TEST_PHONE);
    console.log('✅ 手机号小时级限制已重置');

    // 验证重置后可以正常请求
    const resetReq = createTestRequest(TEST_PHONE, '192.168.4.100', 'device-reset');
    const resetRes = createTestResponse();
    let resetNextCalled = false;

    await rateLimiter.middleware()(resetReq, resetRes, () => { resetNextCalled = true; });

    console.log(`   重置后请求: ${resetNextCalled ? '✅ 通过' : '❌ 仍被拒绝'}`);

    // 测试6: 错误处理
    console.log('\n📋 测试6: 错误处理 - 无手机号请求');
    const noPhoneReq = createTestRequest('', TEST_IP, TEST_DEVICE_ID);
    noPhoneReq.body = {}; // 清空body
    const noPhoneRes = createTestResponse();
    let noPhoneNext = false;

    await rateLimiter.middleware()(noPhoneReq, noPhoneRes, () => { noPhoneNext = true; });
    console.log(`   无手机号请求: ${noPhoneNext ? '✅ 正确跳过限流检查' : '❌ 异常被拒绝'}`);

    // 最终状态检查
    console.log('\n📊 最终限流状态检查:');
    const finalStatus = await rateLimiter.getStatus(TEST_IP, TEST_PHONE, TEST_DEVICE_ID);
    console.log(`   IP: ${finalStatus.ip?.remainingPoints || 0}/30`);
    console.log(`   手机号(小时): ${finalStatus.phoneHourly?.remainingPoints || 0}/5`);
    console.log(`   手机号(日): ${finalStatus.phoneDaily?.remainingPoints || 0}/10`);
    console.log(`   设备(小时): ${finalStatus.deviceHourly?.remainingPoints || 0}/10`);
    console.log(`   设备(日): ${finalStatus.deviceDaily?.remainingPoints || 0}/20`);

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  } finally {
    // 清理测试数据
    if (rateLimiter) {
      try {
        console.log('\n🧹 清理测试数据...');
        await rateLimiter.reset('ip', TEST_IP);
        await rateLimiter.reset('ip', '192.168.2.100');
        await rateLimiter.reset('phone-hourly', TEST_PHONE);
        await rateLimiter.reset('phone-daily', TEST_PHONE);
        await rateLimiter.reset('device-hourly', TEST_DEVICE_ID);
        await rateLimiter.reset('device-hourly', 'test-device-limit');
        await rateLimiter.reset('device-daily', TEST_DEVICE_ID);
        console.log('✅ 测试数据清理完成');
      } catch (cleanupError) {
        console.error('⚠️  清理数据时出错:', cleanupError);
      }
    }

    // 断开Redis连接
    try {
      await disconnectRedis();
      console.log('✅ Redis连接已关闭');
    } catch (disconnectError) {
      console.error('⚠️  关闭Redis连接时出错:', disconnectError);
    }
  }

  console.log('\n🏁 Redis限流测试完成!');
}

// 运行测试
if (require.main === module) {
  testRateLimiterRedis().catch(console.error);
}

export { testRateLimiterRedis };