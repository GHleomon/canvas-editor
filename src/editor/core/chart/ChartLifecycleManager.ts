import { IChartElement, ChartState } from '../../interface/Chart'
import { ChartManager } from './ChartManager'
import { ViewportObserver } from './ViewportObserver'

/**
 * 图表生命周期管理器
 * 负责管理图表的初始化、更新、销毁
 */
export class ChartLifecycleManager {
  private chartManager: ChartManager
  private activeCharts: Set<string>
  private viewportObserver: ViewportObserver
  private maxActiveCharts = 10
  private inactiveTimeout = 30000 // 30秒后回收不可见的图表
  private inactiveTimers: Map<string, number>

  constructor(chartManager: ChartManager) {
    this.chartManager = chartManager
    this.activeCharts = new Set()
    this.viewportObserver = new ViewportObserver()
    this.inactiveTimers = new Map()
  }

  /**
   * 初始化图表实例
   */
  public initChart(element: IChartElement, container: HTMLElement): any {
    // 检查 ECharts 是否已加载
    if (typeof window === 'undefined' || !(window as any).echarts) {
      throw new Error('ECharts library is not loaded')
    }

    const echarts = (window as any).echarts

    try {
      // 初始化 ECharts 实例
      const chart = echarts.init(container)

      // 应用配置
      if (element.chartConfig?.config) {
        chart.setOption(element.chartConfig.config)
      }

      // 标记为活跃
      if (element.chartId) {
        this.activeCharts.add(element.chartId)
        this.clearInactiveTimer(element.chartId)
      }

      return chart
    } catch (error) {
      console.error('Failed to initialize chart:', error)
      throw error
    }
  }

  /**
   * 销毁图表实例
   */
  public disposeChart(chartId: string): void {
    const charts = this.chartManager.getCharts()
    const chartInstance = charts.get(chartId)

    if (!chartInstance) {
      console.warn(`Chart ${chartId} not found`)
      return
    }

    try {
      // 销毁 ECharts 实例
      if (chartInstance.echartsInstance) {
        chartInstance.echartsInstance.dispose()
        chartInstance.echartsInstance = null
      }

      // 更新状态
      chartInstance.state = ChartState.DISPOSED

      // 从活跃集合中移除
      this.activeCharts.delete(chartId)

      // 清理定时器
      this.clearInactiveTimer(chartId)

      console.log(`Chart ${chartId} disposed`)
    } catch (error) {
      console.error(`Failed to dispose chart ${chartId}:`, error)
    }
  }

  /**
   * 处理图表进入可视区域
   */
  public onChartEnterViewport(chartId: string): void {
    const charts = this.chartManager.getCharts()
    const chartInstance = charts.get(chartId)

    if (!chartInstance) return

    // 清理不活跃定时器
    this.clearInactiveTimer(chartId)

    // 如果图表未初始化或已销毁，重新初始化
    if (
      !chartInstance.echartsInstance ||
      chartInstance.state === ChartState.DISPOSED ||
      chartInstance.state === ChartState.INACTIVE
    ) {
      if (chartInstance.container) {
        try {
          chartInstance.state = ChartState.INITIALIZING
          chartInstance.echartsInstance = this.initChart(
            chartInstance.element,
            chartInstance.container
          )
          chartInstance.state = ChartState.ACTIVE
          chartInstance.lastActiveTime = Date.now()

          console.log(`Chart ${chartId} initialized on viewport enter`)
        } catch (error) {
          console.error(`Failed to initialize chart ${chartId}:`, error)
          chartInstance.state = ChartState.ERROR
        }
      }
    } else {
      // 更新活跃时间
      chartInstance.lastActiveTime = Date.now()
      chartInstance.state = ChartState.ACTIVE
    }

    // 检查是否超过最大活跃数量
    this.enforceMaxActiveCharts()
  }

  /**
   * 处理图表离开可视区域
   */
  public onChartLeaveViewport(chartId: string): void {
    const charts = this.chartManager.getCharts()
    const chartInstance = charts.get(chartId)

    if (!chartInstance) return

    // 设置不活跃定时器
    this.setInactiveTimer(chartId)
  }

  /**
   * 调整图表大小
   */
  public resizeChart(chartId: string, width: number, height: number): void {
    const charts = this.chartManager.getCharts()
    const chartInstance = charts.get(chartId)

    if (!chartInstance || !chartInstance.echartsInstance) {
      console.warn(`Chart ${chartId} not found or not initialized`)
      return
    }

    try {
      // 更新元素尺寸
      if (chartInstance.element.chartConfig) {
        chartInstance.element.chartConfig.width = width
        chartInstance.element.chartConfig.height = height
      }

      // 更新容器尺寸
      if (chartInstance.container) {
        chartInstance.container.style.width = `${width}px`
        chartInstance.container.style.height = `${height}px`
      }

      // 调用 ECharts resize
      chartInstance.echartsInstance.resize({
        width,
        height
      })

      // 触发 resize 事件
      this.chartManager.emit('chartResized', {
        chartId,
        data: { width, height }
      })

      console.log(`Chart ${chartId} resized to ${width}x${height}`)
    } catch (error) {
      console.error(`Failed to resize chart ${chartId}:`, error)
    }
  }

  /**
   * 设置不活跃定时器
   */
  private setInactiveTimer(chartId: string): void {
    // 清除现有定时器
    this.clearInactiveTimer(chartId)

    // 设置新定时器
    const timer = window.setTimeout(() => {
      console.log(`Chart ${chartId} inactive timeout, disposing...`)
      this.disposeChart(chartId)
    }, this.inactiveTimeout)

    this.inactiveTimers.set(chartId, timer)
  }

  /**
   * 清除不活跃定时器
   */
  private clearInactiveTimer(chartId: string): void {
    const timer = this.inactiveTimers.get(chartId)
    if (timer) {
      window.clearTimeout(timer)
      this.inactiveTimers.delete(chartId)
    }
  }

  /**
   * 强制执行最大活跃图表数量限制
   */
  private enforceMaxActiveCharts(): void {
    if (this.activeCharts.size <= this.maxActiveCharts) {
      return
    }

    // 找到最久未使用的图表
    const charts = this.chartManager.getCharts()
    const sortedCharts = Array.from(charts.entries())
      .filter(([id]) => this.activeCharts.has(id))
      .sort(
        ([, a], [, b]) => a.lastActiveTime - b.lastActiveTime
      )

    // 销毁最久未使用的图表
    const toDispose = sortedCharts.slice(
      0,
      this.activeCharts.size - this.maxActiveCharts
    )

    toDispose.forEach(([chartId]) => {
      console.log(`Disposing chart ${chartId} due to max active limit`)
      this.disposeChart(chartId)
    })
  }

  /**
   * 获取视口观察器
   */
  public getViewportObserver(): ViewportObserver {
    return this.viewportObserver
  }

  /**
   * 获取活跃图表集合
   */
  public getActiveCharts(): Set<string> {
    return this.activeCharts
  }

  /**
   * 获取最大活跃图表数量
   */
  public getMaxActiveCharts(): number {
    return this.maxActiveCharts
  }

  /**
   * 设置最大活跃图表数量
   */
  public setMaxActiveCharts(max: number): void {
    this.maxActiveCharts = max
    this.enforceMaxActiveCharts()
  }

  /**
   * 获取不活跃超时时间
   */
  public getInactiveTimeout(): number {
    return this.inactiveTimeout
  }

  /**
   * 设置不活跃超时时间
   */
  public setInactiveTimeout(timeout: number): void {
    this.inactiveTimeout = timeout
  }

  /**
   * 清理所有资源
   */
  public dispose(): void {
    // 清理所有定时器
    this.inactiveTimers.forEach(timer => window.clearTimeout(timer))
    this.inactiveTimers.clear()

    // 断开视口观察器
    this.viewportObserver.disconnect()

    // 清空活跃集合
    this.activeCharts.clear()
  }
}
