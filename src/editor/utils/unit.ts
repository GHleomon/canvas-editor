/**
 * 单位转换工具函数
 * 用于厘米和像素之间的转换
 */

// 标准 DPI（每英寸像素数）
const DPI = 96

// 每英寸厘米数
const CM_PER_INCH = 2.54

// 每厘米像素数（96 DPI / 2.54 cm ≈ 37.795）
const PIXELS_PER_CM = DPI / CM_PER_INCH

/**
 * 将厘米转换为像素
 * @param cm 厘米值
 * @returns 像素值（四舍五入取整）
 */
export function cmToPixels(cm: number): number {
  return Math.round(cm * PIXELS_PER_CM)
}

/**
 * 将像素转换为厘米
 * @param pixels 像素值
 * @returns 厘米值（保留两位小数）
 */
export function pixelsToCm(pixels: number): number {
  return Math.round((pixels / PIXELS_PER_CM) * 100) / 100
}
