import { Draw } from '../draw/Draw'
import {
  IChartConfig,
  IChartInstance,
  IChartElement,
  ChartState,
  ChartEventType,
  ChartEventHandler,
  IChartEvent
} from '../../interface/Chart'
import { ChartLifecycleManager } from './ChartLifecycleManager'
import { ChartConfigSerializer } from './ChartConfigSerializer'
import { ChartImageConverter } from './ChartImageConverter'
import { getUUID } from '../../utils'
import { ElementType } from '../../dataset/enum/Element'
import { BlockType } from '../../dataset/enum/Block'
import { EDITOR_PREFIX } from '../../dataset/constant/Editor'

/**
 * 图表管理器
 * 负责协调图表的创建、更新、销毁
 */
export class ChartManager {
  private draw: Draw
  private charts: Map<string, IChartInstance>
  private lifecycleManager: ChartLifecycleManager
  private serializer: ChartConfigSerializer
  private imageConverter: ChartImageConverter
  private eventHandlers: Map<ChartEventType, ChartEventHandler[]>
  private chartContainer: HTMLDivElement | null

  constructor(draw: Draw) {
    this.draw = draw
    this.charts = new Map()
    this.lifecycleManager = new ChartLifecycleManager(this)
    this.serializer = new ChartConfigSerializer()
    this.imageConverter = new ChartImageConverter()
    this.eventHandlers = new Map()
    this.chartContainer = null
    this.initChartContainer()
  }

  /**
   * 初始化图表容器
   */
  private initChartContainer(): void {
    const container = this.draw.getContainer()
    this.chartContainer = document.createElement('div')
    this.chartContainer.classList.add(`${EDITOR_PREFIX}-chart-container`)
    this.chartContainer.style.position = 'absolute'
    this.chartContainer.style.top = '0'
    this.chartContainer.style.left = '0'
    this.chartContainer.style.pointerEvents = 'none'
    container.appendChild(this.chartContainer)
  }

  /**
   * 插入图表
   */
  public insertChart(config: IChartConfig): string {
    try {
      // 验证配置
      const validation = this.serializer.validate(config)
      if (!validation.valid) {
        const error = new Error(`Invalid chart config: ${validation.errors.join(', ')}`)
        this.emit('chartError', {
          chartId: '',
          error
        })
        throw error
      }

      // 生成图表 ID
      const chartId = getUUID()

      // 设置默认尺寸
      const width = config.width || 600
      const height = config.height || 400

      // 创建图表元素
      const chartElement: IChartElement = {
        id: getUUID(),
        type: ElementType.BLOCK,
        value: '',
        block: {
          type: BlockType.ECHARTS,
          echartsBlock: {
            chartId,
            config: config.options || config,
            width,
            height
          }
        },
        chartId,
        chartConfig: {
          config: config.options || config,
          width,
          height,
          minWidth: 100,
          minHeight: 100
        },
        width,
        height
      }

      // 序列化配置
      chartElement.value = this.serializer.serialize(config)

      // 创建 DOM 容器
      const container = this.createChartContainer(chartId, width, height)

      // 创建图表实例记录
      const chartInstance: IChartInstance = {
        chartId,
        element: chartElement,
        echartsInstance: null,
        container,
        state: ChartState.PENDING,
        lastActiveTime: Date.now(),
        eventHandlers: new Map()
      }

      // 保存到映射表
      this.charts.set(chartId, chartInstance)

      // 设置视口观察
      this.setupViewportObserver(chartId, container)

      // 插入到编辑器
      this.draw.insertElementList([chartElement])

      // 触发创建事件
      this.emit('chartCreated', {
        chartId,
        data: config
      })

      console.log(`Chart ${chartId} created successfully`)
      return chartId
    } catch (error) {
      console.error('Failed to insert chart:', error)
      throw error
    }
  }

  /**
   * 更新图表数据
   */
  public updateChart(chartId: string, data: any): void {
    const chartInstance = this.charts.get(chartId)

    if (!chartInstance) {
      console.warn(`Chart ${chartId} not found`)
      return
    }

    try {
      // 更新配置
      if (chartInstance.element.chartConfig) {
        chartInstance.element.chartConfig.config = {
          ...chartInstance.element.chartConfig.config,
          ...data
        }
      }

      // 如果图表已初始化，立即更新
      if (chartInstance.echartsInstance && chartInstance.state === ChartState.ACTIVE) {
        chartInstance.echartsInstance.setOption(data, true)
      }

      // 更新序列化数据
      chartInstance.element.value = this.serializer.serialize(
        chartInstance.element.chartConfig?.config
      )

      // 触发更新事件
      this.emit('chartUpdated', {
        chartId,
        data
      })

      console.log(`Chart ${chartId} updated successfully`)
    } catch (error) {
      console.error(`Failed to update chart ${chartId}:`, error)
      this.emit('chartError', {
        chartId,
        error: error as Error
      })
    }
  }

  /**
   * 获取图表实例
   */
  public getChartInstance(chartId: string): any | null {
    const chartInstance = this.charts.get(chartId)
    return chartInstance?.echartsInstance || null
  }

  /**
   * 删除图表
   */
  public removeChart(chartId: string): void {
    const chartInstance = this.charts.get(chartId)

    if (!chartInstance) {
      console.warn(`Chart ${chartId} not found`)
      return
    }

    try {
      // 销毁 ECharts 实例
      this.lifecycleManager.disposeChart(chartId)

      // 停止视口观察
      this.lifecycleManager.getViewportObserver().unobserve(chartId)

      // 移除 DOM 容器
      if (chartInstance.container && chartInstance.container.parentNode) {
        chartInstance.container.parentNode.removeChild(chartInstance.container)
      }

      // 从映射表中移除
      this.charts.delete(chartId)

      // 触发删除事件
      this.emit('chartRemoved', {
        chartId
      })

      console.log(`Chart ${chartId} removed successfully`)
    } catch (error) {
      console.error(`Failed to remove chart ${chartId}:`, error)
      this.emit('chartError', {
        chartId,
        error: error as Error
      })
    }
  }

  /**
   * 进入打印模式
   */
  public async enterPrintMode(): Promise<void> {
    console.log('Entering print mode...')

    try {
      const converter = this.imageConverter
      const activeCharts = new Map<string, any>()

      // 收集所有活跃的图表实例
      this.charts.forEach((chartInstance, chartId) => {
        if (chartInstance.echartsInstance && chartInstance.state === ChartState.ACTIVE) {
          activeCharts.set(chartId, chartInstance.echartsInstance)
        }
      })

      if (activeCharts.size === 0) {
        console.log('No active charts to convert')
        return
      }

      // 批量转换图表为图片
      const imageDataMap = await converter.convertAllCharts(activeCharts)

      // 缓存图片数据并更新元素
      imageDataMap.forEach((imageData, chartId) => {
        const chartInstance = this.charts.get(chartId)
        if (chartInstance && chartInstance.element.chartConfig) {
          // 缓存图片数据
          chartInstance.element.chartConfig.printImageCache = imageData

          console.log(`Chart ${chartId} converted to image for print mode`)
        }
      })

      console.log(`Print mode entered, ${imageDataMap.size} charts converted`)
    } catch (error) {
      console.error('Failed to enter print mode:', error)
      throw error
    }
  }

  /**
   * 退出打印模式
   */
  public exitPrintMode(): void {
    console.log('Exiting print mode...')

    try {
      // 清除所有图表的打印缓存
      this.charts.forEach((chartInstance, chartId) => {
        if (chartInstance.element.chartConfig?.printImageCache) {
          delete chartInstance.element.chartConfig.printImageCache
          console.log(`Chart ${chartId} print cache cleared`)
        }
      })

      console.log('Print mode exited')
    } catch (error) {
      console.error('Failed to exit print mode:', error)
      throw error
    }
  }

  /**
   * 创建图表容器
   */
  private createChartContainer(
    chartId: string,
    width: number,
    height: number
  ): HTMLDivElement {
    const container = document.createElement('div')
    container.classList.add(`${EDITOR_PREFIX}-chart`)
    container.setAttribute('data-chart-id', chartId)
    container.style.width = `${width}px`
    container.style.height = `${height}px`
    container.style.position = 'absolute'
    container.style.pointerEvents = 'auto'

    if (this.chartContainer) {
      this.chartContainer.appendChild(container)
    }

    return container
  }

  /**
   * 设置视口观察
   */
  private setupViewportObserver(chartId: string, container: HTMLElement): void {
    const observer = this.lifecycleManager.getViewportObserver()

    observer.observe(container, chartId, {
      onEnter: () => {
        console.log(`Chart ${chartId} entered viewport`)
        this.lifecycleManager.onChartEnterViewport(chartId)
      },
      onLeave: () => {
        console.log(`Chart ${chartId} left viewport`)
        this.lifecycleManager.onChartLeaveViewport(chartId)
      }
    })
  }

  /**
   * 注册事件监听器
   */
  public on(event: ChartEventType, handler: ChartEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, [])
    }
    this.eventHandlers.get(event)!.push(handler)
  }

  /**
   * 注销事件监听器
   */
  public off(event: ChartEventType, handler: ChartEventHandler): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * 触发事件
   */
  public emit(event: ChartEventType, data: Omit<IChartEvent, 'type'>): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      const chartEvent: IChartEvent = { ...data, type: event }
      handlers.forEach(handler => {
        try {
          handler(chartEvent)
        } catch (error) {
          console.error(`Error in chart event handler for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 获取 Draw 实例
   */
  public getDraw(): Draw {
    return this.draw
  }

  /**
   * 获取所有图表实例
   */
  public getCharts(): Map<string, IChartInstance> {
    return this.charts
  }

  /**
   * 获取生命周期管理器
   */
  public getLifecycleManager(): ChartLifecycleManager {
    return this.lifecycleManager
  }

  /**
   * 获取配置序列化器
   */
  public getSerializer(): ChartConfigSerializer {
    return this.serializer
  }

  /**
   * 获取图片转换器
   */
  public getImageConverter(): ChartImageConverter {
    return this.imageConverter
  }

  /**
   * 获取图表容器
   */
  public getChartContainer(): HTMLDivElement | null {
    return this.chartContainer
  }

  /**
   * 清理所有资源
   */
  public dispose(): void {
    // 销毁所有图表
    this.charts.forEach((_, chartId) => {
      this.removeChart(chartId)
    })

    // 清理生命周期管理器
    this.lifecycleManager.dispose()

    // 移除图表容器
    if (this.chartContainer && this.chartContainer.parentNode) {
      this.chartContainer.parentNode.removeChild(this.chartContainer)
      this.chartContainer = null
    }

    // 清空事件处理器
    this.eventHandlers.clear()

    console.log('ChartManager disposed')
  }
}
