/**
 * 聚合服务模块测试
 */
import { getAggregateResults, getTotalDataCount } from './aggregateService';

// 模拟 localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// 测试 getAggregateResults 函数
describe('getAggregateResults', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('应该返回默认数据当localStorage为空', () => {
    const results = getAggregateResults();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  test('应该正确处理localStorage中的数据', () => {
    // 模拟提交的数据
    const mockData = [
      {
        userId: '用户001',
        taskId: 'Task_20230601_123456',
        uploadTime: new Date().toISOString(),
        rawData: {
          sleepHours: '7.5',
          dailySteps: '12500',
          exerciseFrequency: '5',
          heartRate: '72',
          mood: 'good'
        },
        perturbedData: {
          sleepHours: '8',
          dailySteps: '12000',
          exerciseFrequency: '5',
          heartRate: '70',
          mood: 'good'
        },
        epsilon: 1.0
      }
    ];
    
    mockLocalStorage.setItem('submittedData', JSON.stringify(mockData));
    const results = getAggregateResults();
    
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(5); // 5个属性
  });

  test('应该处理localStorage读取失败的情况', () => {
    // 模拟localStorage读取失败
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('读取失败');
    });
    
    const results = getAggregateResults();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });
});

// 测试 getTotalDataCount 函数
describe('getTotalDataCount', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('应该返回0当localStorage为空', () => {
    const count = getTotalDataCount();
    expect(count).toBe(0);
  });

  test('应该正确返回数据条数', () => {
    // 模拟提交的数据
    const mockData = [
      {
        userId: '用户001',
        taskId: 'Task_20230601_123456',
        uploadTime: new Date().toISOString(),
        rawData: {
          sleepHours: '7.5',
          dailySteps: '12500',
          exerciseFrequency: '5',
          heartRate: '72',
          mood: 'good'
        },
        perturbedData: {
          sleepHours: '8',
          dailySteps: '12000',
          exerciseFrequency: '5',
          heartRate: '70',
          mood: 'good'
        },
        epsilon: 1.0
      }
    ];
    
    mockLocalStorage.setItem('submittedData', JSON.stringify(mockData));
    const count = getTotalDataCount();
    expect(count).toBe(1);
  });

  test('应该处理localStorage读取失败的情况', () => {
    // 模拟localStorage读取失败
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('读取失败');
    });
    
    const count = getTotalDataCount();
    expect(count).toBe(0);
  });
});