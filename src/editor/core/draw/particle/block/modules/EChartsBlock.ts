import { IRowElement } from '../../../../../interface/Row'
import { IChartElement } from '../../../../../interface/Chart'

/**
 * ECharts 图表块
 * 负责渲染和管理 ECharts 图表实例
 */
export class EChartsBlock {
  private element: IRowElement
  private chartElement: IChartElement
  private chartInstance: any | null
  private container: HTMLDivElement | null
  private static echartsLoaded = false
  private static echarts: any = null

  constructor(element: IRowElement) {
    this.element = element
    this.chartElement = element as IChartElement
    this.chartInstance = null
    this.container = null
  }

  /**
   * 加载 ECharts 库
   */
  private static async loadECharts(): Promise<any> {
    if (EChartsBlock.echartsLoaded && EChartsBlock.echarts) {
      return EChartsBlock.echarts
    }

    try {
      // 尝试从全局对象获取 echarts
      if (typeof window !== 'undefined' && (window as any).echarts) {
        EChartsBlock.echarts = (window as any).echarts
        EChartsBlock.echartsLoaded = true
        return EChartsBlock.echarts
      }

      // 动态导入 echarts
      const echartsModule = await import('echarts')
      EChartsBlock.echarts = echartsModule
      EChartsBlock.echartsLoaded = true
      return EChartsBlock.echarts
    } catch (error) {
      console.error('Failed to load ECharts:', error)
      throw error
    }
  }

  /**
   * 渲染图表到容器
   */
  public render(blockItemContainer: HTMLDivElement): void {
    // 异步加载和渲染
    EChartsBlock.loadECharts()
      .then(echarts => {
        // 创建图表容器
        this.container = document.createElement('div')
        this.container.setAttribute('data-chart-id', this.chartElement.chartId || '')
        this.container.style.width = '100%'
        this.container.style.height = '100%'
        blockItemContainer.appendChild(this.container)

        // 初始化 ECharts 实例
        this.chartInstance = echarts.init(this.container)

        // 获取图表配置
        const chartConfig = this.chartElement.chartConfig?.config || this.chartElement.block?.echartsBlock?.config
        if (chartConfig) {
          this.chartInstance.setOption(chartConfig)
        }

        console.log(`ECharts instance created for chart ${this.chartElement.chartId}`)
      })
      .catch(error => {
        console.error('Failed to render ECharts block:', error)
        this.renderErrorPlaceholder(blockItemContainer)
      })
  }

  /**
   * 打印模式下的快照渲染
   */
  public snapshot(ctx: CanvasRenderingContext2D, x: number, y: number): Promise<IRowElement> {
    return new Promise((resolve) => {
      try {
        // 检查是否有缓存的打印图片
        const printImageCache = this.chartElement.chartConfig?.printImageCache
        if (printImageCache) {
          // 使用缓存的图片
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(
              img,
              x,
              y,
              this.element.metrics.width,
              this.element.metrics.height
            )
            resolve(this.element)
          }
          img.onerror = error => {
            console.error('Failed to load cached print image:', error)
            this.renderPlaceholderToCanvas(ctx, x, y)
            resolve(this.element)
          }
          img.src = printImageCache
        } else if (this.chartInstance) {
          // 实时转换图表为图片
          const imageData = this.chartInstance.getDataURL({
            type: 'png',
            pixelRatio: 2,
            backgroundColor: '#fff'
          })

          const img = new Image()
          img.onload = () => {
            ctx.drawImage(
              img,
              x,
              y,
              this.element.metrics.width,
              this.element.metrics.height
            )
            resolve(this.element)
          }
          img.onerror = error => {
            console.error('Failed to convert chart to image:', error)
            this.renderPlaceholderToCanvas(ctx, x, y)
            resolve(this.element)
          }
          img.src = imageData
        } else {
          // 没有图表实例，渲染占位符
          this.renderPlaceholderToCanvas(ctx, x, y)
          resolve(this.element)
        }
      } catch (error) {
        console.error('Failed to snapshot ECharts block:', error)
        this.renderPlaceholderToCanvas(ctx, x, y)
        resolve(this.element)
      }
    })
  }

  /**
   * 渲染错误占位符
   */
  private renderErrorPlaceholder(container: HTMLDivElement): void {
    const placeholder = document.createElement('div')
    placeholder.style.width = '100%'
    placeholder.style.height = '100%'
    placeholder.style.display = 'flex'
    placeholder.style.alignItems = 'center'
    placeholder.style.justifyContent = 'center'
    placeholder.style.backgroundColor = '#f5f5f5'
    placeholder.style.border = '1px dashed #ccc'
    placeholder.style.color = '#999'
    placeholder.style.fontSize = '14px'
    placeholder.textContent = '图表加载失败'
    container.appendChild(placeholder)
  }

  /**
   * 在 Canvas 上渲染占位符
   */
  private renderPlaceholderToCanvas(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number
  ): void {
    const { width, height } = this.element.metrics

    // 绘制背景
    ctx.fillStyle = '#f5f5f5'
    ctx.fillRect(x, y, width, height)

    // 绘制边框
    ctx.strokeStyle = '#ccc'
    ctx.setLineDash([5, 5])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])

    // 绘制文字
    ctx.fillStyle = '#999'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('图表占位符', x + width / 2, y + height / 2)
  }

  /**
   * 调整图表尺寸
   */
  public resize(width: number, height: number): void {
    if (this.chartInstance && this.container) {
      this.container.style.width = `${width}px`
      this.container.style.height = `${height}px`
      this.chartInstance.resize({
        width,
        height
      })
    }
  }

  /**
   * 销毁图表实例
   */
  public dispose(): void {
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
      this.container = null
    }
  }

  /**
   * 获取图表实例
   */
  public getChartInstance(): echarts.ECharts | null {
    return this.chartInstance
  }
}
