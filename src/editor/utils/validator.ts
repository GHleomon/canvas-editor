/**
 * 输入验证工具函数
 * 用于验证用户输入的有效性
 */

/**
 * 行高验证结果接口
 */
export interface IValidationResult {
  valid: boolean
  error?: string
}

/**
 * 验证行高输入值
 * @param value 输入值（字符串形式）
 * @returns 验证结果 { valid: boolean, error?: string }
 */
export function validateRowHeight(value: string): IValidationResult {
  // 检查空值
  if (value === undefined || value === null || value.trim() === '') {
    return { valid: false, error: '请输入行高值' }
  }

  // 尝试解析为数字
  const num = parseFloat(value)

  // 检查是否为有效数字
  if (isNaN(num)) {
    return { valid: false, error: '请输入有效的数字' }
  }

  // 检查是否为正数
  if (num <= 0) {
    return { valid: false, error: '行高必须大于0' }
  }

  return { valid: true }
}

/**
 * 验证列宽输入值
 * @param value 输入值（字符串形式）
 * @returns 验证结果 { valid: boolean, error?: string }
 */
export function validateColWidth(value: string): IValidationResult {
  // 检查空值
  if (value === undefined || value === null || value.trim() === '') {
    return { valid: false, error: '请输入列宽值' }
  }

  // 尝试解析为数字
  const num = parseFloat(value)

  // 检查是否为有效数字
  if (isNaN(num)) {
    return { valid: false, error: '请输入有效的数字' }
  }

  // 检查是否为正数
  if (num <= 0) {
    return { valid: false, error: '列宽必须大于0' }
  }

  return { valid: true }
}
