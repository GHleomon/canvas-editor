import { NBSP, ZERO } from '../../../dataset/constant/Common'
import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { Draw } from '../Draw'

interface IRadioRenderOption {
  ctx: CanvasRenderingContext2D
  x: number
  y: number
  row: IRow
  index: number
}

export class RadioParticle {
  private draw: Draw
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
  }

  public setSelect(element: IElement) {
    const { radio } = element
    if (radio) {
      radio.value = !radio.value
    } else {
      element.radio = {
        value: true
      }
    }
    this.draw.render({
      isCompute: false,
      isSetCursor: false
    })
  }

  public render(payload: IRadioRenderOption) {
    const { ctx, x, index, row } = payload
    let { y } = payload
    const {
      radio: { gap, lineWidth, fillStyle, strokeStyle, verticalAlign },
      scale
    } = this.options
    const { metrics, radio } = row.elementList[index]
    
    // 0. 获取是否强制显示为Checkbox样式的配置
    // 强转为 any 以避免 TS 类型检查报错（因为官方接口可能没定义这个字段）
    const isForceCheckbox = (this.options.control as any)?.radio?.checkbox

    // 1. 垂直布局计算 (保持原逻辑)
    if (
      verticalAlign === VerticalAlign.TOP ||
      verticalAlign === VerticalAlign.MIDDLE
    ) {
      let nextIndex = index + 1
      let nextElement: IRowElement | null = null
      while (nextIndex < row.elementList.length) {
        nextElement = row.elementList[nextIndex]
        if (nextElement.value !== ZERO && nextElement.value !== NBSP) break
        nextIndex++
      }
      // 以后一个非空格元素为基准
      if (nextElement) {
        const {
          metrics: { boundingBoxAscent, boundingBoxDescent }
        } = nextElement
        const textHeight = boundingBoxAscent + boundingBoxDescent
        if (textHeight > metrics.height) {
          if (verticalAlign === VerticalAlign.TOP) {
            y -= boundingBoxAscent - metrics.height
          } else if (verticalAlign === VerticalAlign.MIDDLE) {
            y -= (textHeight - metrics.height) / 2
          }
        }
      }
    }

    // 2. 坐标计算 (保持原逻辑)
    // left top 四舍五入避免1像素问题
    const left = Math.round(x + gap * scale)
    const top = Math.round(y - metrics.height + lineWidth)
    const width = metrics.width - gap * 2 * scale
    const height = metrics.height
    
    ctx.save()
    ctx.beginPath()
    ctx.translate(0.5, 0.5)

    // 3. 绘制逻辑分支
    if (isForceCheckbox) {
      // --- 分支 A：绘制方形 (看起来像 Checkbox) ---
      
      // A1. 画方框
      ctx.strokeStyle = radio?.value ? fillStyle : strokeStyle
      ctx.lineWidth = lineWidth
      // 使用 rect 画矩形
      ctx.rect(left, top, width, height)
      ctx.stroke()

      // A2. 画勾 (选中状态)
      if (radio?.value) {
        ctx.beginPath()
        ctx.strokeStyle = fillStyle
        // 稍微加粗一点勾，视觉更好看
        ctx.lineWidth = lineWidth + 1 
        // 绘制对号 (Tick) 的路径
        ctx.moveTo(left + width * 0.2, top + height * 0.5)
        ctx.lineTo(left + width * 0.45, top + height * 0.75)
        ctx.lineTo(left + width * 0.8, top + height * 0.25)
        ctx.stroke()
      }

    } else {
      // --- 分支 B：绘制圆形 (原生 Radio 样式) ---
      
      // B1. 边框
      ctx.strokeStyle = radio?.value ? fillStyle : strokeStyle
      ctx.lineWidth = lineWidth
      ctx.arc(left + width / 2, top + height / 2, width / 2, 0, Math.PI * 2)
      ctx.stroke()
      
      // B2. 填充圆点 (选中状态)
      if (radio?.value) {
        ctx.beginPath()
        ctx.fillStyle = fillStyle
        ctx.arc(left + width / 2, top + height / 2, width / 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.closePath()
    ctx.restore()
  }
}