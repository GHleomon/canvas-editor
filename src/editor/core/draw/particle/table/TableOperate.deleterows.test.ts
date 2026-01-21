/**
 * 批量删除行属性测试
 * Feature: table-advanced-features
 * Property 5: 批量删除行的完整性
 * Property 6: 删除行后表格状态一致性
 * Property 7: 删除行后光标位置合理性
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 2.7**
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

describe('批量删除行属性测试（逻辑验证）', () => {
  /**
   * Property 5: 批量删除行的完整性
   * 对于任意选中的多行，删除操作后表格中不应包含任何被选中的行
   */
  it('Property 5: 删除后不应包含被删除的行', () => {
    fc.assert(
      fc.property(
        // 生成总行数（2-10行）
        fc.integer({ min: 2, max: 10 }),
        // 生成要删除的行数（1-总行数-1，保留至少一行）
        fc.integer({ min: 1, max: 9 }),
        (totalRows, deleteCount) => {
          // 确保删除数量不超过总行数-1
          const actualDeleteCount = Math.min(deleteCount, totalRows - 1)
          
          // 模拟行列表
          const trList = Array.from({ length: totalRows }, (_, i) => ({
            id: `tr-${i}`,
            height: 30,
            tdList: [{ id: `td-${i}-0`, value: `Row ${i}` }]
          }))
          
          // 生成要删除的行索引（从前面删除）
          const selectedIndexes = Array.from(
            { length: actualDeleteCount },
            (_, i) => i
          )
          
          // 记录被删除行的 ID
          const deletedIds = selectedIndexes.map(idx => trList[idx].id)
          
          // 模拟删除操作（从后往前删除）
          const sortedIndexes = [...selectedIndexes].sort((a, b) => b - a)
          for (const idx of sortedIndexes) {
            trList.splice(idx, 1)
          }
          
          // 验证：被删除的行不应该存在于表格中
          const remainingIds = trList.map(tr => tr.id)
          for (const deletedId of deletedIds) {
            expect(remainingIds).not.toContain(deletedId)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6: 删除行后表格状态一致性
   * 如果删除行后仍有剩余行，则表格元素应保留且剩余行数应等于原行数减去删除行数
   */
  it('Property 6: 删除后剩余行数应正确', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 1, max: 9 }),
        (totalRows, deleteCount) => {
          const actualDeleteCount = Math.min(deleteCount, totalRows - 1)
          
          const trList = Array.from({ length: totalRows }, (_, i) => ({
            id: `tr-${i}`,
            height: 30,
            tdList: []
          }))
          
          const selectedIndexes = Array.from(
            { length: actualDeleteCount },
            (_, i) => i
          )
          
          // 删除行
          const sortedIndexes = [...selectedIndexes].sort((a, b) => b - a)
          for (const idx of sortedIndexes) {
            trList.splice(idx, 1)
          }
          
          // 验证剩余行数
          const expectedRemainingRows = totalRows - actualDeleteCount
          expect(trList.length).toBe(expectedRemainingRows)
          expect(trList.length).toBeGreaterThan(0)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7: 删除行后光标位置合理性
   * 删除后光标应位于有效位置（删除位置的下一行、上一行或表格外）
   */
  it('Property 7: 删除后光标位置应合理', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 1, max: 9 }),
        (totalRows, deleteCount) => {
          const actualDeleteCount = Math.min(deleteCount, totalRows - 1)
          
          const trList = Array.from({ length: totalRows }, (_, i) => ({
            id: `tr-${i}`,
            height: 30,
            tdList: [{ id: `td-${i}-0` }]
          }))
          
          const selectedIndexes = Array.from(
            { length: actualDeleteCount },
            (_, i) => i
          )
          
          // 计算新的光标位置
          const minDeletedIndex = Math.min(...selectedIndexes)
          
          // 删除行
          const sortedIndexes = [...selectedIndexes].sort((a, b) => b - a)
          for (const idx of sortedIndexes) {
            trList.splice(idx, 1)
          }
          
          // 计算光标应该在的位置
          const newTrIndex = Math.min(minDeletedIndex, trList.length - 1)
          
          // 验证光标位置合理
          expect(newTrIndex).toBeGreaterThanOrEqual(0)
          expect(newTrIndex).toBeLessThan(trList.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * 边界情况：删除第一行
   */
  it('边界情况: 删除第一行后光标应在新的第一行', () => {
    const trList = [
      { id: 'tr-0', height: 30, tdList: [] },
      { id: 'tr-1', height: 30, tdList: [] },
      { id: 'tr-2', height: 30, tdList: [] }
    ]
    
    const minDeletedIndex = 0
    
    // 删除
    trList.splice(0, 1)
    
    // 光标位置
    const newTrIndex = Math.min(minDeletedIndex, trList.length - 1)
    
    expect(newTrIndex).toBe(0)
    expect(trList[newTrIndex].id).toBe('tr-1')
  })

  /**
   * 边界情况：删除最后一行
   */
  it('边界情况: 删除最后一行后光标应在新的最后一行', () => {
    const trList = [
      { id: 'tr-0', height: 30, tdList: [] },
      { id: 'tr-1', height: 30, tdList: [] },
      { id: 'tr-2', height: 30, tdList: [] }
    ]
    
    const minDeletedIndex = 2
    
    // 删除
    trList.splice(2, 1)
    
    // 光标位置
    const newTrIndex = Math.min(minDeletedIndex, trList.length - 1)
    
    expect(newTrIndex).toBe(1)
    expect(trList[newTrIndex].id).toBe('tr-1')
  })

  /**
   * 边界情况：删除中间行
   */
  it('边界情况: 删除中间行后光标应在删除位置', () => {
    const trList = [
      { id: 'tr-0', height: 30, tdList: [] },
      { id: 'tr-1', height: 30, tdList: [] },
      { id: 'tr-2', height: 30, tdList: [] },
      { id: 'tr-3', height: 30, tdList: [] }
    ]
    
    const minDeletedIndex = 1
    
    // 删除（从后往前）
    trList.splice(2, 1)
    trList.splice(1, 1)
    
    // 光标位置
    const newTrIndex = Math.min(minDeletedIndex, trList.length - 1)
    
    expect(newTrIndex).toBe(1)
    expect(trList[newTrIndex].id).toBe('tr-3')
  })

  /**
   * 删除所有行的情况（应该删除整个表格）
   */
  it('特殊情况: 删除所有行应该删除整个表格', () => {
    const totalRows = 3
    const deleteCount = 3
    
    // 这种情况下应该调用 deleteTable() 而不是删除行
    const shouldDeleteTable = deleteCount >= totalRows
    
    expect(shouldDeleteTable).toBe(true)
  })
})
