/**
 * 列宽输入验证属性测试
 * Feature: table-advanced-features, Property 2: 列宽输入验证
 * **Validates: Requirements 1.7**
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { validateColWidth, validateRowHeight } from './validator'

describe('列宽输入验证属性测试', () => {
  /**
   * Property 2: 列宽输入验证
   * 对于任意无效输入值（非正数、空值、非数字字符串），
   * 验证函数应返回 valid: false 并提供错误信息
   */
  it('Property 2: 无效输入应返回 valid: false', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // 空字符串
          fc.constant(''),
          fc.constant('   '),
          // 非数字字符串
          fc.string().filter(s => isNaN(parseFloat(s))),
          // 负数
          fc.double({ min: -1000, max: -0.001 }).map(n => n.toString()),
          // 零
          fc.constant('0'),
          fc.constant('0.0'),
          // 非常接近零的负数
          fc.constant('-0.001')
        ),
        (invalidInput) => {
          const result = validateColWidth(invalidInput)
          
          // 验证返回 valid: false
          expect(result.valid).toBe(false)
          
          // 验证提供了错误信息
          expect(result.error).toBeDefined()
          expect(typeof result.error).toBe('string')
          expect(result.error!.length).toBeGreaterThan(0)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2 补充: 有效输入应返回 valid: true
   * 对于任意有效的正数输入，验证函数应返回 valid: true
   */
  it('Property 2 补充: 有效正数输入应返回 valid: true', () => {
    fc.assert(
      fc.property(
        // 生成正数（0.01 到 1000）
        fc.double({ min: 0.01, max: 1000 }),
        (validNumber) => {
          const result = validateColWidth(validNumber.toString())
          
          // 验证返回 valid: true
          expect(result.valid).toBe(true)
          
          // 验证没有错误信息
          expect(result.error).toBeUndefined()
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 边界情况测试：非常小的正数
   */
  it('边界情况: 非常小的正数应该有效', () => {
    const result = validateColWidth('0.001')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  /**
   * 边界情况测试：非常大的正数
   */
  it('边界情况: 非常大的正数应该有效', () => {
    const result = validateColWidth('99999')
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  /**
   * 边界情况测试：null 和 undefined
   */
  it('边界情况: null 应该无效', () => {
    const result = validateColWidth(null as any)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('边界情况: undefined 应该无效', () => {
    const result = validateColWidth(undefined as any)
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('行高输入验证测试（复用验证）', () => {
  /**
   * 验证行高验证函数与列宽验证函数行为一致
   */
  it('行高验证应与列宽验证行为一致', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.double({ min: 0.01, max: 1000 }).map(n => n.toString()),
          fc.double({ min: -1000, max: -0.001 }).map(n => n.toString())
        ),
        (input) => {
          const colResult = validateColWidth(input)
          const rowResult = validateRowHeight(input)
          
          // 两个验证函数应该返回相同的 valid 状态
          expect(colResult.valid).toBe(rowResult.valid)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
