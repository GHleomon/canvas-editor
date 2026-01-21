/**
 * 列宽单位转换属性测试
 * Feature: table-advanced-features, Property 1: 列宽单位转换往返一致性
 * **Validates: Requirements 4.2, 4.3**
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { cmToPixels, pixelsToCm } from './unit'

describe('列宽单位转换属性测试', () => {
  /**
   * Property 1: 列宽单位转换往返一致性
   * 对于任意有效的厘米值（正数），将其转换为像素后再转换回厘米，
   * 结果应与原值相差不超过 0.01（由于四舍五入精度）
   */
  it('Property 1: 厘米→像素→厘米往返应保持一致性', () => {
    fc.assert(
      fc.property(
        // 生成合理范围内的厘米值（0.1 到 100 厘米）
        fc.double({ min: 0.1, max: 100, noNaN: true }),
        (originalCm) => {
          // 转换：厘米 → 像素 → 厘米
          const pixels = cmToPixels(originalCm)
          const resultCm = pixelsToCm(pixels)
          
          // 验证往返后的值与原值相差不超过 0.01
          const difference = Math.abs(resultCm - originalCm)
          expect(difference).toBeLessThanOrEqual(0.01)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1 补充: 像素→厘米→像素往返应保持一致性
   * 对于任意有效的像素值（正整数），将其转换为厘米后再转换回像素，
   * 结果应与原值相差不超过 1 像素（由于四舍五入）
   */
  it('Property 1 补充: 像素→厘米→像素往返应保持一致性', () => {
    fc.assert(
      fc.property(
        // 生成合理范围内的像素值（1 到 4000 像素）
        fc.integer({ min: 1, max: 4000 }),
        (originalPixels) => {
          // 转换：像素 → 厘米 → 像素
          const cm = pixelsToCm(originalPixels)
          const resultPixels = cmToPixels(cm)
          
          // 验证往返后的值与原值相差不超过 1 像素
          const difference = Math.abs(resultPixels - originalPixels)
          expect(difference).toBeLessThanOrEqual(1)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 单位转换正确性测试：验证转换比率
   * 1 厘米 = 96/2.54 ≈ 37.795 像素
   */
  it('单位转换应使用正确的 DPI 比率', () => {
    // 1 厘米应该约等于 37.795 像素（96 DPI）
    const pixels = cmToPixels(1)
    const expectedPixels = Math.round(96 / 2.54) // ≈ 38
    expect(pixels).toBe(expectedPixels)
    
    // 反向验证
    const cm = pixelsToCm(38)
    expect(cm).toBeCloseTo(1, 2) // 保留两位小数
  })

  /**
   * 边界情况测试：非常小的值
   */
  it('边界情况: 非常小的厘米值应正确转换', () => {
    const pixels = cmToPixels(0.01)
    expect(pixels).toBeGreaterThanOrEqual(0)
    
    // 往返测试
    const cm = pixelsToCm(pixels)
    expect(Math.abs(cm - 0.01)).toBeLessThanOrEqual(0.01)
  })

  /**
   * 边界情况测试：非常大的值
   */
  it('边界情况: 非常大的厘米值应正确转换', () => {
    const pixels = cmToPixels(1000)
    expect(pixels).toBeGreaterThan(0)
    
    // 往返测试
    const cm = pixelsToCm(pixels)
    expect(Math.abs(cm - 1000)).toBeLessThanOrEqual(0.01)
  })

  /**
   * 精度测试：验证厘米值保留两位小数
   */
  it('像素转厘米应保留两位小数精度', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        (pixels) => {
          const cm = pixelsToCm(pixels)
          
          // 验证结果最多有两位小数
          const decimalPlaces = (cm.toString().split('.')[1] || '').length
          expect(decimalPlaces).toBeLessThanOrEqual(2)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 单调性测试：更大的厘米值应该产生更大的像素值
   */
  it('Property: 单调性 - 更大的厘米值应产生更大的像素值', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.1, max: 50, noNaN: true }),
        fc.double({ min: 0.1, max: 50, noNaN: true }),
        (cm1, cm2) => {
          if (cm1 === cm2) return true
          
          const pixels1 = cmToPixels(cm1)
          const pixels2 = cmToPixels(cm2)
          
          // 如果 cm1 < cm2，则 pixels1 应该 <= pixels2
          if (cm1 < cm2) {
            expect(pixels1).toBeLessThanOrEqual(pixels2)
          } else {
            expect(pixels1).toBeGreaterThanOrEqual(pixels2)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 线性性测试：转换应该是线性的
   */
  it('Property: 线性性 - 2倍的厘米值应产生约2倍的像素值', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 50, noNaN: true }),
        (cm) => {
          const pixels1 = cmToPixels(cm)
          const pixels2 = cmToPixels(cm * 2)
          
          // pixels2 应该约等于 pixels1 * 2（允许 ±1 的误差）
          const expected = pixels1 * 2
          const difference = Math.abs(pixels2 - expected)
          expect(difference).toBeLessThanOrEqual(1)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
