import { IViewportCallback } from '../../interface/Chart'

/**
 * 视口观察器
 * 使用 IntersectionObserver API 监听图表可见性
 */
export class ViewportObserver {
  private observer: IntersectionObserver | null
  private callbacks: Map<string, IViewportCallback>
  private elementMap: Map<string, HTMLElement>

  constructor() {
    this.observer = null
    this.callbacks = new Map()
    this.elementMap = new Map()
    this.initObserver()
  }

  /**
   * 初始化 IntersectionObserver
   */
  private initObserver(): void {
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('IntersectionObserver is not supported in this browser')
      return
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const chartId = entry.target.getAttribute('data-chart-id')
          if (!chartId) return

          const callback = this.callbacks.get(chartId)
          if (!callback) return

          if (entry.isIntersecting) {
            // 图表进入可视区域
            callback.onEnter()
          } else {
            // 图表离开可视区域
            callback.onLeave()
          }
        })
      },
      {
        root: null, // 使用视口作为根
        rootMargin: '50px', // 提前 50px 触发
        threshold: 0.1 // 10% 可见时触发
      }
    )
  }

  /**
   * 观察图表元素
   */
  public observe(
    element: HTMLElement,
    chartId: string,
    callback: IViewportCallback
  ): void {
    if (!this.observer) {
      console.warn('IntersectionObserver not available, skipping observation')
      // 如果不支持 IntersectionObserver，直接调用 onEnter
      callback.onEnter()
      return
    }

    // 设置 data-chart-id 属性
    element.setAttribute('data-chart-id', chartId)

    // 保存回调和元素引用
    this.callbacks.set(chartId, callback)
    this.elementMap.set(chartId, element)

    // 开始观察
    this.observer.observe(element)
  }

  /**
   * 停止观察
   */
  public unobserve(chartId: string): void {
    const element = this.elementMap.get(chartId)
    if (element && this.observer) {
      this.observer.unobserve(element)
    }

    // 清理引用
    this.callbacks.delete(chartId)
    this.elementMap.delete(chartId)
  }

  /**
   * 清理所有观察
   */
  public disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.callbacks.clear()
    this.elementMap.clear()
  }

  /**
   * 获取回调映射
   */
  public getCallbacks(): Map<string, IViewportCallback> {
    return this.callbacks
  }

  /**
   * 获取元素映射
   */
  public getElementMap(): Map<string, HTMLElement> {
    return this.elementMap
  }

  /**
   * 检查是否正在观察某个图表
   */
  public isObserving(chartId: string): boolean {
    return this.callbacks.has(chartId)
  }
}
