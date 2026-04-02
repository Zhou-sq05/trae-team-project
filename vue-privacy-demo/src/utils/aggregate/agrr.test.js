/**
 * 聚合算法模块测试
 */
import { 
  aggregateAGRR, 
  calculateMSE, 
  calculateConsistency, 
  calculateMAE, 
  calculateVariance 
} from './agrr';

// 测试 aggregateAGRR 函数
describe('aggregateAGRR', () => {
  test('应该正确聚合扰动数据', () => {
    const perturbedData = [1, 1, 2, 3, 1, 2, 3, 3, 2, 1];
    const epsilon = 1.0;
    const domainSize = 4;
    const result = aggregateAGRR(perturbedData, epsilon, domainSize);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(domainSize);
  });

  test('应该返回空数组当输入为空数组', () => {
    const result = aggregateAGRR([], 1.0, 4);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  test('应该处理边界值', () => {
    const perturbedData = [0, 0, 0];
    const epsilon = 0.1;
    const domainSize = 2;
    const result = aggregateAGRR(perturbedData, epsilon, domainSize);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(domainSize);
  });
});

// 测试 calculateMSE 函数
describe('calculateMSE', () => {
  test('应该正确计算均方误差', () => {
    const originalValues = [1, 2, 3, 4, 5];
    const estimatedValues = [1.1, 2.1, 3.1, 4.1, 5.1];
    const mse = calculateMSE(originalValues, estimatedValues);
    expect(typeof mse).toBe('number');
    expect(mse).toBeGreaterThanOrEqual(0);
  });

  test('应该返回0当输入为空数组', () => {
    const mse = calculateMSE([], [1, 2, 3]);
    expect(mse).toBe(0);
  });

  test('应该处理长度不同的数组', () => {
    const originalValues = [1, 2, 3];
    const estimatedValues = [1.1, 2.1];
    const mse = calculateMSE(originalValues, estimatedValues);
    expect(typeof mse).toBe('number');
  });
});

// 测试 calculateConsistency 函数
describe('calculateConsistency', () => {
  test('应该正确计算重合度', () => {
    const originalValues = [1, 2, 3, 4, 5];
    const estimatedValues = [1, 2, 3, 4, 5];
    const consistency = calculateConsistency(originalValues, estimatedValues);
    expect(typeof consistency).toBe('number');
    expect(consistency).toBe(1.0);
  });

  test('应该返回0当输入为空数组', () => {
    const consistency = calculateConsistency([], [1, 2, 3]);
    expect(consistency).toBe(0);
  });

  test('应该处理有小差异的值', () => {
    const originalValues = [1, 2, 3, 4, 5];
    const estimatedValues = [1, 2, 4, 4, 6];
    const consistency = calculateConsistency(originalValues, estimatedValues);
    expect(typeof consistency).toBe('number');
    expect(consistency).toBeGreaterThan(0);
    expect(consistency).toBeLessThan(1);
  });
});

// 测试 calculateMAE 函数
describe('calculateMAE', () => {
  test('应该正确计算平均绝对误差', () => {
    const originalValues = [1, 2, 3, 4, 5];
    const estimatedValues = [1.5, 2.5, 3.5, 4.5, 5.5];
    const mae = calculateMAE(originalValues, estimatedValues);
    expect(typeof mae).toBe('number');
    expect(mae).toBe(0.5);
  });

  test('应该返回0当输入为空数组', () => {
    const mae = calculateMAE([], [1, 2, 3]);
    expect(mae).toBe(0);
  });
});

// 测试 calculateVariance 函数
describe('calculateVariance', () => {
  test('应该正确计算方差', () => {
    const estimatedValues = [1, 2, 3, 4, 5];
    const variance = calculateVariance(estimatedValues);
    expect(typeof variance).toBe('number');
    expect(variance).toBeGreaterThan(0);
  });

  test('应该返回0当输入数组长度小于等于1', () => {
    const variance1 = calculateVariance([]);
    const variance2 = calculateVariance([5]);
    expect(variance1).toBe(0);
    expect(variance2).toBe(0);
  });
});