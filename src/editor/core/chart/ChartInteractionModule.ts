import { IChartInteractionConfig } from '../../interface/Chart'

/**
 * 拖拽状态接口
 */
interface IDragState {
  isActive: boolean // 是否正在拖拽
  seriesIndex: number // 当前曲线索引
  startPointIndex: number // 起始点索引
  currentPointIndex: number // 当前点索引
  lastProcessedIndex: number // 上次处理的索引（防止重复）
  startMouseX: number // 起始鼠标 X 坐标
  startMouseY: number // 起始鼠标 Y 坐标
  yAxisIndex: number // Y 轴索引
  isInitialPlot: boolean // 是否为初始画点
  isExtending: boolean // 是否在追加新点模式
}

/**
 * 图表交互模块
 * 封装 ChartTestECharts 的交互功能
 */
export class ChartInteractionModule {
  private chart: any // ECharts 实例
  private config: IChartInteractionConfig
  private container: HTMLElement // 图表容器
  private dragState: IDragState
  private mouseDownHandler: ((event: MouseEvent) => void) | null = null
  private mouseMoveHandler: ((event: MouseEvent) => void) | null = null
  private mouseUpHandler: ((event: MouseEvent) => void) | null = null
  private keyUpHandler: ((event: KeyboardEvent) => void) | null = null
  private doubleClickHandler: ((event: MouseEvent) => void) | null = null

  constructor(chart: any, config: IChartInteractionConfig, container: HTMLElement) {
    this.chart = chart
    this.config = config
    this.container = container

    // 初始化拖拽状态
    this.dragState = {
      isActive: false,
      seriesIndex: -1,
      startPointIndex: -1,
      currentPointIndex: -1,
      lastProcessedIndex: -1,
      startMouseX: 0,
      startMouseY: 0,
      yAxisIndex: 0,
      isInitialPlot: false,
      isExtending: false
    }

    this.initEventListeners()
  }

  /**
   * 初始化事件监听器
   */
  private initEventListeners(): void {
    console.log('[ChartInteraction] 初始化事件监听器')

    // 拖拽编辑功能
    if (this.config.enableDragEdit) {
      this.setupDragEdit()
    }

    // 双击删除/恢复功能
    if (this.config.enableDragEdit) {
      this.setupDoubleClick()
    }

    console.log('[ChartInteraction] 事件监听器初始化完成')
  }

  /**
   * 设置拖拽编辑功能
   */
  private setupDragEdit(): void {
    console.log('[ChartInteraction] 设置拖拽编辑功能')

    // 鼠标按下处理器
    this.mouseDownHandler = (event: MouseEvent) => {
      // 检查 Shift 键是否按下
      if (this.config.shiftKeyRequired && !event.shiftKey) {
        return
      }

      console.log('[ChartInteraction] mousedown 事件触发，Shift 键已按下')

      // 获取点击位置的数据索引
      const bbox = this.container.getBoundingClientRect()
      const xPixel = event.clientX - bbox.left
      // const yPixel = event.clientY - bbox.top

      let dataIndex: number
      try {
        dataIndex = this.pixelToDataIndex(xPixel)
        console.log('[ChartInteraction] 点击位置对应的数据索引:', dataIndex)
      } catch (error) {
        console.error('[ChartInteraction] 获取数据索引失败:', error)
        return
      }

      // 查找点击的曲线
      const clickedSeries = this.findClickedSeries(event, dataIndex)

      // 检查是否点击到数据点
      if (!clickedSeries) {
        // 未点击到数据点，检查图表是否为空
        const isEmpty = this.isEmptyChart()

        if (!isEmpty || !this.config.enableEmptyChartPlot) {
          // 图表非空且未点击到数据点，或未启用空图表画点，不启动拖拽
          console.log('[ChartInteraction] 未点击到数据点且图表非空，不启动拖拽')
          return
        }

        // 图表为空，启用初始画点模式
        console.log('[ChartInteraction] 图表为空，启用初始画点模式')

        // 初始化 dragState 对象（初始画点模式）
        this.dragState.isActive = true
        this.dragState.seriesIndex = 0 // 默认第一条曲线
        this.dragState.startPointIndex = dataIndex
        this.dragState.currentPointIndex = dataIndex
        this.dragState.lastProcessedIndex = -1 // 初始画点时设为 -1
        this.dragState.startMouseX = event.clientX
        this.dragState.startMouseY = event.clientY
        this.dragState.yAxisIndex = 0 // 默认使用第一个 Y 轴
        this.dragState.isInitialPlot = true

        console.log('[ChartInteraction] dragState 已初始化（初始画点）:', this.dragState)
      } else {
        // 点击到现有数据点
        console.log('[ChartInteraction] 点击到数据点:', clickedSeries)

        // 使用实际找到的索引
        const actualIndex =
          clickedSeries.actualIndex !== undefined ? clickedSeries.actualIndex : dataIndex

        // 初始化 dragState 对象（编辑现有点模式）
        const option = this.chart.getOption()
        this.dragState.isActive = true
        this.dragState.seriesIndex = clickedSeries.seriesIndex
        this.dragState.startPointIndex = actualIndex
        this.dragState.currentPointIndex = actualIndex
        this.dragState.lastProcessedIndex = actualIndex
        this.dragState.startMouseX = event.clientX
        this.dragState.startMouseY = event.clientY
        this.dragState.yAxisIndex = option.series[clickedSeries.seriesIndex].yAxisIndex || 0
        this.dragState.isInitialPlot = false

        console.log('[ChartInteraction] dragState 已初始化（编辑现有点）:', this.dragState)
      }

      // 设置鼠标样式为 crosshair
      this.container.style.cursor = 'crosshair'

      // 添加 mousemove 和 mouseup 监听器
      setTimeout(() => {
        console.log('[ChartInteraction] 添加 mousemove 和 mouseup 监听器')
        document.addEventListener('mousemove', this.mouseMoveHandler!, true)
        document.addEventListener('mouseup', this.mouseUpHandler!, true)
      }, 0)

      // 阻止默认行为
      event.preventDefault()
      event.stopPropagation()
    }

    // 鼠标移动处理器
    this.mouseMoveHandler = (event: MouseEvent) => {
      // 检查 dragState.isActive 是否为 true
      if (!this.dragState.isActive) {
        return
      }

      // 检查 Shift 键是否仍然按下，如果释放则终止拖拽
      if (this.config.shiftKeyRequired && !event.shiftKey) {
        console.log('[ChartInteraction] Shift 键已释放，停止拖拽')
        this.stopDragging()
        return
      }

      // 获取当前鼠标位置的数据索引
      const bbox = this.container.getBoundingClientRect()
      const xPixel = event.clientX - bbox.left
      const yPixel = event.clientY - bbox.top

      const currentIndex = this.pixelToDataIndex(xPixel)

      // 获取当前鼠标位置的数据值
      const currentValue = this.pixelToValue(yPixel, this.dragState.yAxisIndex)

      console.log('[ChartInteraction] 当前位置:', {
        currentIndex,
        currentValue: currentValue.toFixed(2),
        lastProcessedIndex: this.dragState.lastProcessedIndex
      })

      // 应用数值范围限制
      const clampedValue = this.clampValue(this.dragState.seriesIndex, currentValue)

      // 获取当前配置
      const option = this.chart.getOption()

      // 计算需要更新的索引范围
      let minIndex: number, maxIndex: number
      if (this.dragState.lastProcessedIndex === -1) {
        // 初始画点：只更新当前索引
        minIndex = currentIndex
        maxIndex = currentIndex
        console.log('[ChartInteraction] 初始画点模式，更新索引:', currentIndex)
      } else {
        // 正常拖拽：更新从上次处理的索引到当前索引之间的所有点（双向拖拽）
        minIndex = Math.min(this.dragState.lastProcessedIndex, currentIndex)
        maxIndex = Math.max(this.dragState.lastProcessedIndex, currentIndex)
        console.log('[ChartInteraction] 双向拖拽模式，更新索引范围:', `[${minIndex}, ${maxIndex}]`)
      }

      // 循环更新范围内的所有数据点（连续画点）
      let pointsUpdated = 0
      for (let i = minIndex; i <= maxIndex; i++) {
        if (i < 0 || i >= option.xAxis[0].data.length) {
          console.warn(`[ChartInteraction] 索引 ${i} 超出范围，跳过`)
          continue
        }

        // 更新或创建数据点
        this.updateContinuousPoints(this.dragState.seriesIndex, i, i, clampedValue)
        pointsUpdated++
      }

      console.log(`[ChartInteraction] 已更新 ${pointsUpdated} 个数据点`)

      // 使用 lazyUpdate: true 更新图表
      this.chart.setOption(option, { lazyUpdate: true })

      // 更新 dragState.lastProcessedIndex 为当前索引
      this.dragState.lastProcessedIndex = currentIndex
      this.dragState.currentPointIndex = currentIndex

      console.log('[ChartInteraction] dragState 已更新:', {
        currentPointIndex: this.dragState.currentPointIndex,
        lastProcessedIndex: this.dragState.lastProcessedIndex
      })
    }

    // 鼠标释放处理器
    this.mouseUpHandler = (_event: MouseEvent) => {
      console.log('[ChartInteraction] mouseup 触发')

      // 移除事件监听器
      console.log('[ChartInteraction] 移除 mousemove 和 mouseup 监听器')
      document.removeEventListener('mousemove', this.mouseMoveHandler!, true)
      document.removeEventListener('mouseup', this.mouseUpHandler!, true)

      this.stopDragging()
    }

    // Shift 键释放处理器
    this.keyUpHandler = (event: KeyboardEvent) => {
      // 检测 Shift 键释放事件
      if (event.key === 'Shift') {
        // 检查 dragState.isActive 状态
        if (this.dragState.isActive) {
          console.log('[ChartInteraction] Shift 键释放，停止拖拽')
          this.stopDragging()
        }
      }
    }

    // 添加事件监听器
    this.container.addEventListener('mousedown', this.mouseDownHandler)
    document.addEventListener('keyup', this.keyUpHandler)

    console.log('[ChartInteraction] 拖拽编辑功能设置完成')
  }

  /**
   * 停止拖拽
   */
  private stopDragging(): void {
    // 检查 dragState.isActive 是否为 true
    if (!this.dragState.isActive) {
      return
    }

    console.log('[ChartInteraction] 拖拽结束, dragState:', this.dragState)

    // 重置 dragState 对象的所有字段
    this.dragState.isActive = false
    this.dragState.seriesIndex = -1
    this.dragState.startPointIndex = -1
    this.dragState.currentPointIndex = -1
    this.dragState.lastProcessedIndex = -1
    this.dragState.startMouseX = 0
    this.dragState.startMouseY = 0
    this.dragState.yAxisIndex = 0
    this.dragState.isInitialPlot = false
    this.dragState.isExtending = false

    // 恢复鼠标样式为 default
    this.container.style.cursor = 'default'

    // 使用 lazyUpdate: false 最终更新图表
    const option = this.chart.getOption()
    this.chart.setOption(option, { lazyUpdate: false })

    console.log('[ChartInteraction] 拖拽状态已完全清理')
  }

  /**
   * 设置双击操作功能
   */
  private setupDoubleClick(): void {
    console.log('[ChartInteraction] 设置双击操作功能')

    let lastClickTime = 0
    let lastClickIndex = -1
    let lastClickSeriesIndex = -1

    this.doubleClickHandler = (event: MouseEvent) => {
      const currentTime = Date.now()
      const timeDiff = currentTime - lastClickTime

      // 获取点击位置的数据索引
      const bbox = this.container.getBoundingClientRect()
      const xPixel = event.clientX - bbox.left

      let dataIndex: number
      try {
        dataIndex = this.pixelToDataIndex(xPixel)
      } catch (error) {
        console.error('[ChartInteraction] 获取数据索引失败:', error)
        return
      }

      // 查找点击的曲线
      const clickedSeries = this.findClickedSeries(event, dataIndex)

      if (!clickedSeries) {
        // 未点击到数据点，重置状态
        lastClickTime = 0
        lastClickIndex = -1
        lastClickSeriesIndex = -1
        return
      }

      const actualIndex =
        clickedSeries.actualIndex !== undefined ? clickedSeries.actualIndex : dataIndex

      // 检测双击（两次点击间隔 < 300ms 且点击同一个点）
      if (
        timeDiff < 300 &&
        lastClickIndex === actualIndex &&
        lastClickSeriesIndex === clickedSeries.seriesIndex
      ) {
        console.log('[ChartInteraction] 检测到双击:', {
          seriesIndex: clickedSeries.seriesIndex,
          dataIndex: actualIndex
        })

        // 双击处理
        this.handleDoubleClick(clickedSeries.seriesIndex, actualIndex)

        // 重置状态
        lastClickTime = 0
        lastClickIndex = -1
        lastClickSeriesIndex = -1
      } else {
        // 记录本次点击
        lastClickTime = currentTime
        lastClickIndex = actualIndex
        lastClickSeriesIndex = clickedSeries.seriesIndex
      }
    }

    // 添加事件监听器
    this.container.addEventListener('click', this.doubleClickHandler)

    console.log('[ChartInteraction] 双击操作功能设置完成')
  }

  /**
   * 处理双击（删除/恢复数据点）
   */
  private handleDoubleClick(seriesIndex: number, dataIndex: number): void {
    console.log('[ChartInteraction] 处理双击:', { seriesIndex, dataIndex })

    const option = this.chart.getOption()
    const series = option.series[seriesIndex]
    const currentValue = series.data[dataIndex]

    if (currentValue === null || currentValue === undefined) {
      // 恢复点：使用前后平均值
      this.restorePoint(seriesIndex, dataIndex)
    } else {
      // 删除点：设置为 null
      this.deletePoint(seriesIndex, dataIndex)
    }
  }

  /**
   * 空图表画点 (预留功能)
   */
  // private handleEmptyChartPlot(_params: any): void {
  //   // 此功能已集成到 setupDragEdit 的 mouseDownHandler 中
  //   console.log('[ChartInteraction] 空图表画点功能已集成到拖拽编辑中')
  // }

  /**
   * 连续更新数据点
   */
  private updateContinuousPoints(
    seriesIndex: number,
    startIndex: number,
    endIndex: number,
    yValue: number
  ): void {
    const option = this.chart.getOption()
    const series = option.series[seriesIndex]

    // 应用数值限制
    const clampedValue = this.clampValue(seriesIndex, yValue)

    // 更新所有经过的点
    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < series.data.length) {
        series.data[i] = clampedValue
      }
    }

    this.chart.setOption(option)
  }

  /**
   * 删除数据点
   */
  private deletePoint(seriesIndex: number, dataIndex: number): void {
    console.log('[ChartInteraction] 删除数据点:', { seriesIndex, dataIndex })

    const option = this.chart.getOption()
    const series = option.series[seriesIndex]
    series.data[dataIndex] = null
    this.chart.setOption(option)

    console.log('[ChartInteraction] 数据点已删除')
  }

  /**
   * 恢复数据点（使用前后平均值）
   */
  private restorePoint(seriesIndex: number, dataIndex: number): void {
    console.log('[ChartInteraction] 恢复数据点:', { seriesIndex, dataIndex })

    const option = this.chart.getOption()
    const series = option.series[seriesIndex]
    const data = series.data

    // 查找前一个有效点
    let prevValue: number | null = null
    for (let i = dataIndex - 1; i >= 0; i--) {
      if (data[i] !== null && data[i] !== undefined) {
        prevValue = data[i]
        break
      }
    }

    // 查找后一个有效点
    let nextValue: number | null = null
    for (let i = dataIndex + 1; i < data.length; i++) {
      if (data[i] !== null && data[i] !== undefined) {
        nextValue = data[i]
        break
      }
    }

    // 计算平均值
    let restoredValue: number
    if (prevValue !== null && nextValue !== null) {
      restoredValue = (prevValue + nextValue) / 2
    } else if (prevValue !== null) {
      restoredValue = prevValue
    } else if (nextValue !== null) {
      restoredValue = nextValue
    } else {
      console.warn('[ChartInteraction] 无法恢复数据点，没有有效的前后值')
      return // 无法恢复
    }

    series.data[dataIndex] = restoredValue
    this.chart.setOption(option)

    console.log('[ChartInteraction] 数据点已恢复:', restoredValue)
  }

  /**
   * 创建初始数据点 (预留功能)
   */
  // private createInitialPoint(seriesIndex: number, dataIndex: number, yValue: number): void {
  //   console.log('[ChartInteraction] 创建初始数据点:', { seriesIndex, dataIndex, yValue })

  //   const option = this.chart.getOption()
  //   const series = option.series[seriesIndex]
  //   const clampedValue = this.clampValue(seriesIndex, yValue)
  //   series.data[dataIndex] = clampedValue
  //   this.chart.setOption(option)

  //   console.log('[ChartInteraction] 初始数据点已创建')
  // }

  /**
   * 数值限制
   */
  private clampValue(seriesIndex: number, value: number): number {
    const limits = this.config.valueLimits?.[seriesIndex]
    if (!limits) return value

    return Math.max(limits.lowLimit, Math.min(limits.highLimit, value))
  }

  /**
   * 区域删除
   */
  public deleteRegion(
    seriesIndex: number,
    startIndex: number,
    endIndex: number
  ): void {
    console.log('[ChartInteraction] 区域删除:', { seriesIndex, startIndex, endIndex })

    const option = this.chart.getOption()
    const series = option.series[seriesIndex]

    for (let i = startIndex; i <= endIndex; i++) {
      if (i >= 0 && i < series.data.length) {
        series.data[i] = null
      }
    }

    this.chart.setOption(option)

    console.log('[ChartInteraction] 区域删除完成')
  }

  /**
   * 批量追加数据点
   * 根据时间差决定是连续填充还是插入断点
   * 
   * @param seriesIndex - 曲线索引
   * @param startPoint - 起始点 {time: "HH:mm", value: number}
   * @param endTime - 结束时间 "HH:mm"
   * @param collectInterval - 采集间隔（分钟），默认 5
   * @returns 操作结果 {success: boolean, pointsAdded: number, breakPointInserted: boolean}
   */
  public addMultiplePoints(
    seriesIndex: number,
    startPoint: { time: string; value: number },
    endTime: string,
    collectInterval = 5
  ): { success: boolean; pointsAdded: number; breakPointInserted: boolean; error?: string } {
    console.log('[ChartInteraction] 批量追加数据点:', {
      seriesIndex,
      startPoint,
      endTime,
      collectInterval
    })

    try {
      // 1. 验证参数
      if (!startPoint || typeof startPoint !== 'object') {
        throw new Error('起始点参数无效')
      }

      if (!this.isValidTimeFormat(startPoint.time)) {
        throw new Error(`无效的起始时间格式: ${startPoint.time}，应为 HH:mm`)
      }

      if (!this.isValidTimeFormat(endTime)) {
        throw new Error(`无效的结束时间格式: ${endTime}，应为 HH:mm`)
      }

      // 2. 应用数值范围限制
      const clampedValue = this.clampValue(seriesIndex, startPoint.value)

      if (clampedValue !== startPoint.value) {
        console.log(
          `[ChartInteraction] 起始点数值已限制: ${startPoint.value} -> ${clampedValue}`
        )
      }

      // 创建限制后的起始点
      const clampedStartPoint = {
        time: startPoint.time,
        value: clampedValue
      }

      // 3. 计算时间差
      const timeDiff = this.getTimeDiffInMinutes(startPoint.time, endTime)

      if (timeDiff <= 0) {
        throw new Error(`结束时间必须大于起始时间: ${startPoint.time} -> ${endTime}`)
      }

      console.log(`[ChartInteraction] 时间差: ${timeDiff} 分钟`)

      // 4. 根据时间差选择模式
      let result
      if (timeDiff >= 20) {
        // 时间差 >= 20 分钟：插入断点模式
        console.log('[ChartInteraction] 时间差 >= 20 分钟，使用断点模式')
        result = this.addContinuousPoints(seriesIndex, clampedStartPoint, endTime, {
          interval: collectInterval,
          insertBreakPoint: true,
          breakThreshold: 20
        })
      } else {
        // 时间差 < 20 分钟：连续填充模式
        console.log('[ChartInteraction] 时间差 < 20 分钟，使用连续填充模式')
        result = this.addContinuousPoints(seriesIndex, clampedStartPoint, endTime, {
          interval: collectInterval,
          insertBreakPoint: false,
          breakThreshold: 20
        })
      }

      console.log('[ChartInteraction] 批量追加完成:', result)
      return result
    } catch (error) {
      console.error('[ChartInteraction] 批量追加失败:', error)
      return {
        success: false,
        pointsAdded: 0,
        breakPointInserted: false,
        error: (error as Error).message
      }
    }
  }

  /**
   * 延伸曲线到指定时间
   * 查找最后一个有效点并使用其值进行延伸
   * 
   * @param seriesIndex - 曲线索引
   * @param targetTime - 目标时间 "HH:mm"
   * @param value - 延伸使用的数值（可选，默认使用最后有效点的值）
   * @returns 操作结果 {success: boolean, pointsAdded: number, lastValidPoint: Object}
   */
  public extendToTime(
    seriesIndex: number,
    targetTime: string,
    value?: number | null
  ): {
    success: boolean
    pointsAdded: number
    lastValidPoint: { index: number; time: string; value: number } | null
    extendValue?: number
    error?: string
  } {
    console.log('[ChartInteraction] 延伸曲线:', { seriesIndex, targetTime, value })

    try {
      // 1. 获取图表配置
      const option = this.chart.getOption()

      // 2. 验证参数
      if (seriesIndex < 0 || seriesIndex >= option.series.length) {
        throw new Error(`无效的曲线索引: ${seriesIndex}`)
      }

      if (!this.isValidTimeFormat(targetTime)) {
        throw new Error(`无效的目标时间格式: ${targetTime}，应为 HH:mm`)
      }

      // 3. 查找最后一个有效点
      const lastValidPoint = this.findLastValidPoint(seriesIndex)

      if (!lastValidPoint) {
        throw new Error('曲线没有有效数据点，无法延伸')
      }

      console.log('[ChartInteraction] 最后有效点:', lastValidPoint)

      // 4. 确定延伸使用的值
      let extendValue: number
      if (value !== null && value !== undefined) {
        // 使用指定的值
        extendValue = value
        console.log(`[ChartInteraction] 使用指定值延伸: ${extendValue}`)
      } else {
        // 使用最后有效点的值
        extendValue = lastValidPoint.value
        console.log(`[ChartInteraction] 使用最后有效点的值延伸: ${extendValue}`)
      }

      // 5. 验证目标时间是否在最后有效点之后
      const timeDiff = this.getTimeDiffInMinutes(lastValidPoint.time, targetTime)

      if (timeDiff <= 0) {
        throw new Error(
          `目标时间必须大于最后有效点的时间: ${lastValidPoint.time} -> ${targetTime}`
        )
      }

      console.log(`[ChartInteraction] 延伸时间差: ${timeDiff} 分钟`)

      // 6. 调用 addContinuousPoints 延伸曲线（不插入断点）
      const result = this.addContinuousPoints(
        seriesIndex,
        {
          time: lastValidPoint.time,
          value: extendValue
        },
        targetTime,
        {
          interval: 5,
          insertBreakPoint: false, // 延伸时不插入断点
          breakThreshold: 20
        }
      )

      // 7. 返回操作结果
      const extendResult = {
        success: result.success,
        pointsAdded: result.pointsAdded,
        lastValidPoint: lastValidPoint,
        extendValue: extendValue
      }

      console.log('[ChartInteraction] 延伸曲线完成:', extendResult)
      return extendResult
    } catch (error) {
      console.error('[ChartInteraction] 延伸曲线失败:', error)
      return {
        success: false,
        pointsAdded: 0,
        lastValidPoint: null,
        error: (error as Error).message
      }
    }
  }

  /**
   * 像素坐标转数据索引
   */
  private pixelToDataIndex(xPixel: number): number {
    const option = this.chart.getOption()
    const grid = option.grid[0]
    const xAxis = option.xAxis[0]

    // 获取图表宽度
    const chartWidth = this.chart.getWidth()

    // 解析 grid 的 left 和 right 值
    const gridLeft = this.parseGridValue(grid.left, chartWidth)
    const gridRight = this.parseGridValue(grid.right, chartWidth)

    // 计算网格宽度
    const gridWidth = chartWidth - gridLeft - gridRight

    // 计算相对于网格左边界的像素位置
    const relativeX = xPixel - gridLeft

    // 计算数据索引
    const totalPoints = xAxis.data.length
    const dataIndex = Math.round((relativeX / gridWidth) * (totalPoints - 1))

    // 限制索引范围
    return Math.max(0, Math.min(totalPoints - 1, dataIndex))
  }

  /**
   * 像素坐标转数据值
   */
  private pixelToValue(yPixel: number, yAxisIndex: number): number {
    const option = this.chart.getOption()
    const grid = option.grid[0]
    const yAxis = option.yAxis[yAxisIndex]

    // 获取图表高度
    const chartHeight = this.chart.getHeight()

    // 解析 grid 的 top 和 bottom 值
    const gridTop = this.parseGridValue(grid.top, chartHeight)
    const gridBottom = this.parseGridValue(grid.bottom, chartHeight)

    // 计算网格高度
    const gridHeight = chartHeight - gridTop - gridBottom

    // 计算相对于网格底部的像素位置
    const relativeY = chartHeight - gridBottom - yPixel

    // 计算数据值
    const yMin = yAxis.min || 0
    const yMax = yAxis.max || 100
    const value = yMin + (relativeY / gridHeight) * (yMax - yMin)

    return value
  }

  /**
   * 解析 grid 值（支持百分比和像素）
   */
  private parseGridValue(value: string | number, totalSize: number): number {
    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'string') {
      if (value.endsWith('%')) {
        const percent = parseFloat(value)
        return (percent / 100) * totalSize
      } else {
        return parseFloat(value)
      }
    }

    return 0
  }

  /**
   * 查找点击的曲线
   */
  private findClickedSeries(
    event: MouseEvent,
    dataIndex: number
  ): { seriesIndex: number; actualIndex: number } | null {
    const option = this.chart.getOption()
    const bbox = this.container.getBoundingClientRect()
    const yPixel = event.clientY - bbox.top

    // 遍历所有曲线，查找最接近的数据点
    let closestSeries: { seriesIndex: number; actualIndex: number; distance: number } | null = null

    for (let i = 0; i < option.series.length; i++) {
      const series = option.series[i]
      const yAxisIndex = series.yAxisIndex || 0
      const dataValue = series.data[dataIndex]

      // 跳过 null 值
      if (dataValue === null || dataValue === undefined) {
        continue
      }

      // 计算数据点的像素位置
      const pointYPixel = this.valueToPixel(dataValue, yAxisIndex)

      // 计算距离
      const distance = Math.abs(pointYPixel - yPixel)

      // 更新最接近的曲线
      if (!closestSeries || distance < closestSeries.distance) {
        closestSeries = {
          seriesIndex: i,
          actualIndex: dataIndex,
          distance
        }
      }
    }

    // 如果最接近的点距离小于 20 像素，认为点击到了该点
    if (closestSeries && closestSeries.distance < 20) {
      return {
        seriesIndex: closestSeries.seriesIndex,
        actualIndex: closestSeries.actualIndex
      }
    }

    return null
  }

  /**
   * 数据值转像素坐标
   */
  private valueToPixel(value: number, yAxisIndex: number): number {
    const option = this.chart.getOption()
    const grid = option.grid[0]
    const yAxis = option.yAxis[yAxisIndex]

    // 获取图表高度
    const chartHeight = this.chart.getHeight()

    // 解析 grid 的 top 和 bottom 值
    const gridTop = this.parseGridValue(grid.top, chartHeight)
    const gridBottom = this.parseGridValue(grid.bottom, chartHeight)

    // 计算网格高度
    const gridHeight = chartHeight - gridTop - gridBottom

    // 计算数据值对应的像素位置
    const yMin = yAxis.min || 0
    const yMax = yAxis.max || 100
    const relativeY = ((value - yMin) / (yMax - yMin)) * gridHeight

    // 计算绝对像素位置
    const yPixel = chartHeight - gridBottom - relativeY

    return yPixel
  }

  /**
   * 检查图表是否为空
   */
  private isEmptyChart(): boolean {
    const option = this.chart.getOption()

    // 检查所有曲线是否都没有有效数据
    for (const series of option.series) {
      for (const value of series.data) {
        if (value !== null && value !== undefined) {
          return false
        }
      }
    }

    return true
  }

  /**
   * 验证时间格式是否为 "HH:mm"
   */
  private isValidTimeFormat(time: string): boolean {
    if (typeof time !== 'string') {
      return false
    }

    // 检查格式是否为 HH:mm
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
    return timeRegex.test(time)
  }

  /**
   * 给时间添加分钟数
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number)
    let totalMinutes = hours * 60 + mins + minutes

    // 处理跨天情况
    totalMinutes = totalMinutes % (24 * 60)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60
    }

    const newHours = Math.floor(totalMinutes / 60)
    const newMins = totalMinutes % 60

    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`
  }

  /**
   * 计算两个时间之间的分钟差
   */
  private getTimeDiffInMinutes(time1: string, time2: string): number {
    const [hours1, mins1] = time1.split(':').map(Number)
    const [hours2, mins2] = time2.split(':').map(Number)

    const totalMinutes1 = hours1 * 60 + mins1
    const totalMinutes2 = hours2 * 60 + mins2

    let diff = totalMinutes2 - totalMinutes1

    // 处理跨天情况（假设时间差不超过24小时）
    if (diff < 0) {
      diff += 24 * 60
    }

    return diff
  }

  /**
   * 为单个曲线添加数据点
   * 此方法会检查时间是否已存在，如果存在则更新，否则添加新点
   * 添加新点时会保持所有曲线的时间轴一致
   */
  private addSinglePointToSeries(seriesIndex: number, time: string, value: number | null): void {
    console.log('[ChartInteraction] 为曲线添加数据点:', { seriesIndex, time, value })

    const option = this.chart.getOption()

    // 验证参数
    if (seriesIndex < 0 || seriesIndex >= option.series.length) {
      throw new Error(`无效的曲线索引: ${seriesIndex}`)
    }

    if (!this.isValidTimeFormat(time)) {
      throw new Error(`无效的时间格式: ${time}，应为 HH:mm`)
    }

    // 检查时间是否已存在
    const timeIndex = option.xAxis[0].data.indexOf(time)

    if (timeIndex !== -1) {
      // 时间已存在，更新现有点
      console.log(`[ChartInteraction] 时间 ${time} 已存在于索引 ${timeIndex}，更新数据点`)
      option.series[seriesIndex].data[timeIndex] = value
    } else {
      // 时间不存在，添加新点
      console.log(`[ChartInteraction] 时间 ${time} 不存在，添加新时间点`)

      // 添加新时间点到 X 轴
      option.xAxis[0].data.push(time)

      // 为所有曲线添加数据点
      for (let i = 0; i < option.series.length; i++) {
        if (i === seriesIndex) {
          // 当前曲线使用指定的值
          option.series[i].data.push(value)
        } else {
          // 其他曲线使用最后一个有效值（保持时间轴一致）
          const lastValue = this.findLastValidValue(option.series[i].data)
          option.series[i].data.push(lastValue)
          console.log(`[ChartInteraction] 曲线 ${i} 使用最后有效值: ${lastValue}`)
        }
      }
    }

    this.chart.setOption(option)
    console.log('[ChartInteraction] 数据点添加完成')
  }

  /**
   * 查找数组中最后一个有效值（非 null 和 undefined）
   */
  private findLastValidValue(dataArray: any[]): number | null {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      return null
    }

    // 从后向前查找最后一个有效值
    for (let i = dataArray.length - 1; i >= 0; i--) {
      if (dataArray[i] !== null && dataArray[i] !== undefined) {
        return dataArray[i]
      }
    }

    // 如果没有有效值，返回 null
    return null
  }

  /**
   * 查找最后一个有效点（非 null 值）
   * 返回该点的索引、时间和值
   */
  private findLastValidPoint(
    seriesIndex: number
  ): { index: number; time: string; value: number } | null {
    console.log('[ChartInteraction] 查找最后有效点:', { seriesIndex })

    try {
      const option = this.chart.getOption()

      // 验证参数
      if (seriesIndex < 0 || seriesIndex >= option.series.length) {
        throw new Error(`无效的曲线索引: ${seriesIndex}`)
      }

      const seriesData = option.series[seriesIndex].data
      const timeData = option.xAxis[0].data

      if (!Array.isArray(seriesData) || seriesData.length === 0) {
        console.log('[ChartInteraction] 曲线数据为空')
        return null
      }

      // 从后向前查找最后一个非 null 值
      for (let i = seriesData.length - 1; i >= 0; i--) {
        const value = seriesData[i]

        if (value !== null && value !== undefined) {
          const result = {
            index: i,
            time: timeData[i],
            value: value
          }

          console.log('[ChartInteraction] 找到最后有效点:', result)
          return result
        }
      }

      // 没有找到有效点
      console.log('[ChartInteraction] 没有找到有效点')
      return null
    } catch (error) {
      console.error('[ChartInteraction] 查找最后有效点失败:', error)
      return null
    }
  }

  /**
   * 从起始点连续填充到目标时间
   * 根据时间差和配置选项决定使用连续填充模式还是断点模式
   */
  private addContinuousPoints(
    seriesIndex: number,
    startPoint: { time: string; value: number },
    targetTime: string,
    options: {
      interval: number
      insertBreakPoint: boolean
      breakThreshold: number
    }
  ): { success: boolean; pointsAdded: number; breakPointInserted: boolean } {
    console.log('[ChartInteraction] 连续画点:', { seriesIndex, startPoint, targetTime, options })

    try {
      const { interval, insertBreakPoint, breakThreshold } = options

      // 应用数值范围限制
      const clampedValue = this.clampValue(seriesIndex, startPoint.value)

      // 计算时间差
      const timeDiff = this.getTimeDiffInMinutes(startPoint.time, targetTime)

      if (timeDiff <= 0) {
        throw new Error(`目标时间必须大于起始时间: ${startPoint.time} -> ${targetTime}`)
      }

      console.log(`[ChartInteraction] 时间差: ${timeDiff} 分钟`)

      // 初始化结果变量
      let pointsAdded = 0
      let breakPointInserted = false

      // 判断是否需要插入断点
      if (timeDiff > breakThreshold && insertBreakPoint) {
        // 断点模式：插入断点后直接跳到目标时间
        console.log(
          `[ChartInteraction] 时间差 ${timeDiff} 分钟 > 断点阈值 ${breakThreshold} 分钟，使用断点模式`
        )

        // 在起始点后插入断点（值为 null）
        const breakPointTime = this.addMinutesToTime(startPoint.time, interval)
        this.addSinglePointToSeries(seriesIndex, breakPointTime, null)
        breakPointInserted = true
        pointsAdded++
        console.log(`[ChartInteraction] 插入断点: ${breakPointTime}`)

        // 直接跳到目标时间添加数据点
        this.addSinglePointToSeries(seriesIndex, targetTime, clampedValue)
        pointsAdded++
        console.log(`[ChartInteraction] 跳到目标时间: ${targetTime}, 值: ${clampedValue}`)
      } else {
        // 连续填充模式：循环添加中间点
        console.log(
          `[ChartInteraction] 时间差 ${timeDiff} 分钟 <= 断点阈值 ${breakThreshold} 分钟，使用连续填充模式`
        )

        let currentTime = startPoint.time

        // 从起始点开始，每次增加 interval 分钟
        while (true) {
          // 计算下一个时间点
          currentTime = this.addMinutesToTime(currentTime, interval)

          // 检查是否已经到达或超过目标时间
          const remainingDiff = this.getTimeDiffInMinutes(currentTime, targetTime)

          if (remainingDiff < 0) {
            // 已经超过目标时间，停止循环
            break
          }

          // 添加数据点
          this.addSinglePointToSeries(seriesIndex, currentTime, clampedValue)
          pointsAdded++
          console.log(`[ChartInteraction] 添加中间点: ${currentTime}, 值: ${clampedValue}`)

          // 如果已经到达目标时间，停止循环
          if (remainingDiff === 0) {
            break
          }
        }
      }

      console.log('[ChartInteraction] 连续画点完成')

      return {
        success: true,
        pointsAdded: pointsAdded,
        breakPointInserted: breakPointInserted
      }
    } catch (error) {
      console.error('[ChartInteraction] 连续画点失败:', error)
      return {
        success: false,
        pointsAdded: 0,
        breakPointInserted: false
      }
    }
  }

  /**
   * 清理事件监听器
   */
  public dispose(): void {
    console.log('[ChartInteraction] 清理事件监听器')

    // 移除鼠标事件监听器
    if (this.mouseDownHandler) {
      this.container.removeEventListener('mousedown', this.mouseDownHandler)
      this.mouseDownHandler = null
    }

    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler, true)
      this.mouseMoveHandler = null
    }

    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler, true)
      this.mouseUpHandler = null
    }

    // 移除键盘事件监听器
    if (this.keyUpHandler) {
      document.removeEventListener('keyup', this.keyUpHandler)
      this.keyUpHandler = null
    }

    // 移除双击事件监听器
    if (this.doubleClickHandler) {
      this.container.removeEventListener('click', this.doubleClickHandler)
      this.doubleClickHandler = null
    }

    console.log('[ChartInteraction] 事件监听器已清理')
  }
}
