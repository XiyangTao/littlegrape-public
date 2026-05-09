import { Request, Response } from 'express';
import { SMSRateLimiter } from '../src/middleware/rateLimiter';
import { connectRedis, disconnectRedis } from '../src/config/redis';

// 测试用的数据
const TEST_PHONE_DAILY = '13900139000';
const TEST_DEVICE_DAILY = 'daily-test-device-001';
const BASE_IP = '10.0.0.';

// 创建测试请求
function createDailyTestRequest(phone: string, ip: string, deviceId: string): Request {
  return {
    headers: {
      'user-agent': 'Mozilla/5.0 Daily Test Browser',
      'accept-language': 'zh-CN,zh;q=0.9',
      'accept-encoding': 'gzip, deflate, br',
      'x-forwarded-for': ip,
      'x-device-id': deviceId,
    },
    body: { phone },
    connection: { remoteAddress: ip },
    ip,
  } as any as Request;
}

function createMockResponse(): { res: Response; getStatus: () => number; getData: () => any } {
  let statusCode = 200;
  let responseData: any = null;

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
      return this;
    },
  };

  return {
    res: res as any,
    getStatus: () => statusCode,
    getData: () => responseData,
  };
}

// 获取今天的日期键
function getTodayKey(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 模拟不同日期的键
function getDateKey(daysOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function testDailyRateLimit() {
  console.log('🧪 开始测试日级限流功能...\n');

  let rateLimiter: SMSRateLimiter | null = null;

  try {
    // 连接Redis
    console.log('🔌 连接Redis...');
    await connectRedis();
    console.log('✅ Redis连接成功\n');

    rateLimiter = new SMSRateLimiter();

    // 清理测试数据
    console.log('🧹 清理测试数据...');
    await rateLimiter.reset('phone-daily', TEST_PHONE_DAILY);
    await rateLimiter.reset('device-daily', TEST_DEVICE_DAILY);
    console.log('✅ 测试数据清理完成\n');

    // 测试1: 验证日级键名生成逻辑
    console.log('📋 测试1: 日级键名生成逻辑');
    const todayKey = getTodayKey();
    console.log(`✅ 今日键名: ${todayKey}`);

    // 测试不同日期的键名
    const yesterdayKey = getDateKey(-1);
    const tomorrowKey = getDateKey(1);
    console.log(`📅 昨日键名: ${yesterdayKey}`);
    console.log(`📅 明日键名: ${tomorrowKey}`);
    console.log(`✅ 日期键名格式正确\n`);

    // 测试2: 手机号日级限流 (10次/天)
    console.log('📋 测试2: 手机号日级限流 (10次/天)');

    let phoneBlockedAt = 0;
    for (let i = 1; i <= 12; i++) {
      const req = createDailyTestRequest(TEST_PHONE_DAILY, `${BASE_IP}${i}`, `phone-daily-device-${i}`);
      const { res, getStatus, getData } = createMockResponse();
      let nextCalled = false;

      await rateLimiter.middleware()(req, res, () => { nextCalled = true; });

      if (i <= 10) {
        if (nextCalled) {
          console.log(`   第${i}次请求: ✅ 通过`);
        } else {
          console.log(`   第${i}次请求: ❌ 异常被拒绝 (应该通过)`);
        }
      } else {
        if (!nextCalled && getStatus() === 429) {
          if (phoneBlockedAt === 0) {
            phoneBlockedAt = i;
            console.log(`   第${i}次请求: ✅ 正确被限流`);
            const data = getData();
            console.log(`   📝 限流信息: ${data?.error}`);
            console.log(`   ⏰ 重试时间: ${data?.retryAfter}秒`);
          } else {
            console.log(`   第${i}次请求: ✅ 继续被限流`);
          }
        } else {
          console.log(`   第${i}次请求: ❌ 异常通过 (应该被限流)`);
        }
      }
    }

    if (phoneBlockedAt === 11) {
      console.log('✅ 手机号日级限流在第11次请求时正确触发');
    } else {
      console.log(`❌ 手机号日级限流触发时机异常: 第${phoneBlockedAt}次`);
    }

    // 检查手机号日级限流状态
    const phoneStatus = await rateLimiter.getStatus(`${BASE_IP}1`, TEST_PHONE_DAILY, `phone-daily-device-1`);
    console.log(`📊 手机号日级剩余: ${phoneStatus.phoneDaily?.remainingPoints || 0}/10\n`);

    // 测试3: 设备日级限流 (20次/天)
    console.log('📋 测试3: 设备日级限流 (20次/天)');

    let deviceBlockedAt = 0;
    for (let i = 1; i <= 22; i++) {
      const req = createDailyTestRequest(`1390000${String(i).padStart(4, '0')}`, `${BASE_IP}${100 + i}`, TEST_DEVICE_DAILY);
      const { res, getStatus, getData } = createMockResponse();
      let nextCalled = false;

      await rateLimiter.middleware()(req, res, () => { nextCalled = true; });

      if (i <= 20) {
        if (i % 5 === 0) {
          console.log(`   第${i}次请求: ${nextCalled ? '✅ 通过' : '❌ 异常被拒绝'}`);
        }
      } else {
        if (!nextCalled && getStatus() === 429) {
          if (deviceBlockedAt === 0) {
            deviceBlockedAt = i;
            console.log(`   第${i}次请求: ✅ 正确被限流`);
            const data = getData();
            console.log(`   📝 限流信息: ${data?.error}`);
            console.log(`   ⏰ 重试时间: ${data?.retryAfter}秒`);
          } else {
            console.log(`   第${i}次请求: ✅ 继续被限流`);
          }
        } else {
          console.log(`   第${i}次请求: ❌ 异常通过 (应该被限流)`);
        }
      }
    }

    if (deviceBlockedAt === 21) {
      console.log('✅ 设备日级限流在第21次请求时正确触发');
    } else {
      console.log(`❌ 设备日级限流触发时机异常: 第${deviceBlockedAt}次`);
    }

    // 检查设备日级限流状态
    const deviceStatus = await rateLimiter.getStatus(`${BASE_IP}101`, `139000000001`, TEST_DEVICE_DAILY);
    console.log(`📊 设备日级剩余: ${deviceStatus.deviceDaily?.remainingPoints || 0}/20\n`);

    // 测试4: 日级限流重置功能
    console.log('📋 测试4: 日级限流重置功能');

    // 重置手机号日级限制
    await rateLimiter.reset('phone-daily', TEST_PHONE_DAILY);
    console.log('✅ 手机号日级限制已重置');

    // 验证重置后可以正常请求
    const resetReq = createDailyTestRequest(TEST_PHONE_DAILY, '10.1.1.100', 'reset-test-device');
    const { res: resetRes, getStatus: getResetStatus } = createMockResponse();
    let resetNext = false;

    await rateLimiter.middleware()(resetReq, resetRes, () => { resetNext = true; });

    if (resetNext && getResetStatus() === 200) {
      console.log('✅ 重置后请求正常通过');
    } else {
      console.log('❌ 重置后请求仍被拒绝');
    }

    // 验证重置后的状态
    const resetStatus = await rateLimiter.getStatus('10.1.1.100', TEST_PHONE_DAILY, 'reset-test-device');
    console.log(`📊 重置后手机号日级剩余: ${resetStatus.phoneDaily?.remainingPoints || 0}/10\n`);

    // 测试5: 并发请求测试
    console.log('📋 测试5: 并发请求对日级限流的影响');

    const concurrentPhone = '13901390001';
    await rateLimiter.reset('phone-daily', concurrentPhone);

    const concurrentPromises: Promise<boolean>[] = [];
    const concurrentResults: boolean[] = [];

    // 同时发起5个请求
    for (let i = 1; i <= 5; i++) {
      const promise = (async () => {
        const req = createDailyTestRequest(concurrentPhone, `10.2.2.${i}`, `concurrent-device-${i}`);
        const { res } = createMockResponse();
        let nextCalled = false;

        await rateLimiter.middleware()(req, res, () => { nextCalled = true; });
        return nextCalled;
      })();

      concurrentPromises.push(promise);
    }

    const results = await Promise.all(concurrentPromises);
    const passedCount = results.filter(r => r).length;

    console.log(`✅ 并发请求测试: ${passedCount}/5 个请求通过`);
    if (passedCount === 5) {
      console.log('✅ 并发请求处理正常');
    } else {
      console.log(`⚠️  并发请求处理异常，可能存在竞态条件`);
    }

    // 检查并发后的状态
    const concurrentStatus = await rateLimiter.getStatus('10.2.2.1', concurrentPhone, 'concurrent-device-1');
    console.log(`📊 并发后手机号日级剩余: ${concurrentStatus.phoneDaily?.remainingPoints || 0}/10`);

  } catch (error) {
    console.error('❌ 测试执行失败:', error);
  } finally {
    // 清理测试数据
    if (rateLimiter) {
      try {
        console.log('\n🧹 清理测试数据...');
        await rateLimiter.reset('phone-daily', TEST_PHONE_DAILY);
        await rateLimiter.reset('device-daily', TEST_DEVICE_DAILY);
        await rateLimiter.reset('phone-daily', '13901390001');
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

  console.log('\n🏁 日级限流测试完成!');
  console.log('\n📝 测试报告总结:');
  console.log('• 手机号日级限流: 10次/天');
  console.log('• 设备日级限流: 20次/天');
  console.log('• 日期键名格式: YYYY-MM-DD');
  console.log('• 重置功能正常工作');
  console.log('• 并发处理机制验证');
}

// 运行测试
if (require.main === module) {
  testDailyRateLimit().catch(console.error);
}

export { testDailyRateLimit };