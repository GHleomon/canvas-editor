/**
 * 行间距管理类
 * 用于设置和获取文本的行间距
 */
import {
  DEFAULT_LINE_SPACING,
  MAX_LINE_SPACING,
  MIN_LINE_SPACING
} from '../../../dataset/constant/LineSpacing'
import { RangeManager } from '../../range/RangeManager'
import { Draw } from '../Draw'

export class LineSpacing {
  private draw: Draw
  private range: RangeManager

  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
  }

  /**
   * 设置行间距
   * @param spacing 行间距倍数（0.1-3.0）
   */
  public setLineSpacing(spacing: number): void {
    // 验证行间距范围
    if (spacing < MIN_LINE_SPACING || spacing > MAX_LINE_SPACING) {
      return
    }

    const { startIndex, endIndex } = this.range.getRange()
    if (!~startIndex && !~endIndex) return

    const elementList = this.draw.getElementList()

    // 应用行间距到选中的元素
    for (let i = startIndex; i <= endIndex; i++) {
      const element = elementList[i]
      if (element) {
        element.lineSpacing = spacing
      }
    }

    // 重新渲染
    this.draw.render({ curIndex: endIndex })
  }

  /**
   * 获取当前行间距
   * @returns 行间距值或默认值
   */
  public getCurrentLineSpacing(): number {
    const { startIndex } = this.range.getRange()
    if (!~startIndex) return DEFAULT_LINE_SPACING

    const elementList = this.draw.getElementList()
    const element = elementList[startIndex]

    return element?.lineSpacing || DEFAULT_LINE_SPACING
  }
}
