import { IElement } from '../../interface/Element'
import { ElementType } from '../../dataset/enum/Element'
import { getUUID } from '../../utils'

/**
 * 图表图片转换器
 * 打印模式下将图表转换为图片
 */
export class ChartImageConverter {
  /**
   * 将图表转换为图片
   */
  public async convertToImage(chart: any): Promise<string> {
    try {
      if (!chart || typeof chart.getDataURL !== 'function') {
        throw new Error('Invalid ECharts instance')
      }

      // 使用 ECharts 的 getDataURL 方法生成图片
      const dataURL = chart.getDataURL({
        type: 'png',
        pixelRatio: 2, // 提高清晰度
        backgroundColor: '#fff'
      })

      return dataURL
    } catch (error) {
      console.error('Failed to convert chart to image:', error)
      throw error
    }
  }

  /**
   * 批量转换所有图表
   */
  public async convertAllCharts(
    charts: Map<string, any>
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>()
    const promises: Promise<void>[] = []

    charts.forEach((chart, chartId) => {
      const promise = this.convertToImage(chart)
        .then(dataURL => {
          results.set(chartId, dataURL)
        })
        .catch(error => {
          console.error(`Failed to convert chart ${chartId}:`, error)
          // 使用占位符图片
          results.set(chartId, this.getFallbackImage())
        })

      promises.push(promise)
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 创建图片元素
   */
  public createImageElement(
    base64: string,
    width: number,
    height: number
  ): IElement {
    return {
      id: getUUID(),
      type: ElementType.IMAGE,
      value: base64,
      width,
      height
    }
  }

  /**
   * 获取占位符图片（当转换失败时使用）
   */
  private getFallbackImage(): string {
    // 创建一个简单的 SVG 占位符
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
        <rect width="400" height="300" fill="#f0f0f0"/>
        <text x="200" y="150" text-anchor="middle" font-family="Arial" font-size="16" fill="#999">
          图表加载失败
        </text>
      </svg>
    `

    // 转换为 Base64
    const base64 = btoa(unescape(encodeURIComponent(svg)))
    return `data:image/svg+xml;base64,${base64}`
  }

  /**
   * 验证 Base64 图片数据
   */
  public validateImageData(base64: string): boolean {
    try {
      // 检查是否是有效的 data URL
      if (!base64.startsWith('data:image/')) {
        return false
      }

      // 尝试解码 Base64
      const base64Data = base64.split(',')[1]
      if (!base64Data) {
        return false
      }

      atob(base64Data)
      return true
    } catch (error) {
      console.error('Invalid image data:', error)
      return false
    }
  }

  /**
   * 压缩图片数据（如果需要）
   */
  public async compressImage(
    base64: string,
    quality = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }

        ctx.drawImage(img, 0, 0)

        // 转换为 JPEG 以压缩
        const compressed = canvas.toDataURL('image/jpeg', quality)
        resolve(compressed)
      }

      img.onerror = () => {
        reject(new Error('Failed to load image'))
      }

      img.src = base64
    })
  }
}
