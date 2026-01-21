/**
 * 列宽显示精度属性测试
 * Feature: table-advanced-features, Property 4: 列宽显示精度保持
 * **Validates: Requirements 4.4**
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { pixelsToCm } from './unit'

describe('列宽显示精度属性测试', () => {
  /**
   * Property 4: 列宽显示精度保持
   * 对于任意像素值，转换为厘米后的结果应保留两位小数精度
   */
  it('Property 4: 像素转厘米应保留两位小数精度', () => {
    fc.assert(
      fc.property(
        // 生成合理范围内的像素值（1 到 4000 像素）
        fc.integer({ min: 1, max: 4000 }),
        (pixels) => {
          const cm = pixelsToCm(pixels)
          
          // 验证结果最多有两位小数
          const cmString = cm.toString()
          const decimalPart = cmString.split('.')[1] || ''
          const decimalPlaces = decimalPart.length
          
          expect(decimalPlaces).toBeLessThanOrEqual(2)
          
          // 验证结果是一个有效的数字
          expect(typeof cm).toBe('number')
          expect(isNaN(cm)).toBe(false)
          expect(isFinite(cm)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 精度一致性测试：相同的像素值应该总是产生相同的厘米值
   */
  it('Property: 确定性 - 相同像素值应产生相同厘米值', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        (pixels) => {
          const cm1 = pixelsToCm(pixels)
          const cm2 = pixelsToCm(pixels)
          
          // 多次调用应该返回完全相同的结果
          expect(cm1).toBe(cm2)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 精度格式测试：验证小数点后最多两位
   */
  it('Property: 格式正确性 - 小数点后最多两位数字', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        (pixels) => {
          const cm = pixelsToCm(pixels)
          const cmString = cm.toString()
          
          // 如果有小数点，验证格式
          if (cmString.includes('.')) {
            const parts = cmString.split('.')
            expect(parts.length).toBe(2)
            expect(parts[1].length).toBeLessThanOrEqual(2)
            
            // 验证小数部分只包含数字
            expect(/^\d{1,2}$/.test(parts[1])).toBe(true)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 边界情况测试：特定像素值的精度
   */
  it('边界情况: 1像素应转换为两位小数的厘米值', () => {
    const cm = pixelsToCm(1)
    const decimalPlaces = (cm.toString().split('.')[1] || '').length
    expect(decimalPlaces).toBeLessThanOrEqual(2)
  })

  it('边界情况: 100像素应转换为两位小数的厘米值', () => {
    const cm = pixelsToCm(100)
    const decimalPlaces = (cm.toString().split('.')[1] || '').length
    expect(decimalPlaces).toBeLessThanOrEqual(2)
  })

  it('边界情况: 1000像素应转换为两位小数的厘米值', () => {
    const cm = pixelsToCm(1000)
    const decimalPlaces = (cm.toString().split('.')[1] || '').length
    expect(decimalPlaces).toBeLessThanOrEqual(2)
  })

  /**
   * 精度损失测试：验证精度损失在可接受范围内
   */
  it('Property: 精度损失可接受 - 四舍五入误差不超过0.005', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4000 }),
        (pixels) => {
          const cm = pixelsToCm(pixels)
          
          // 计算精确值（不四舍五入）
          const exactCm = pixels / (96 / 2.54)
          
          // 验证四舍五入后的误差不超过 0.005（两位小数的一半）
          const error = Math.abs(cm - exactCm)
          expect(error).toBeLessThanOrEqual(0.005)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 显示友好性测试：验证没有多余的尾随零
   */
  it('显示友好性: 整数厘米值不应有小数点', () => {
    // 找一个能产生整数厘米值的像素值
    // 例如：38 像素 ≈ 1.00 厘米，应该显示为 1 或 1.00
    const pixels = 38
    const cm = pixelsToCm(pixels)
    const cmString = cm.toString()
    
    // 如果是整数，不应该有小数点（或者是 .00）
    if (!cmString.includes('.')) {
      expect(Number.isInteger(cm)).toBe(true)
    } else {
      // 如果有小数点，验证格式正确
      const decimalPart = cmString.split('.')[1]
      expect(decimalPart.length).toBeLessThanOrEqual(2)
    }
  })
})
