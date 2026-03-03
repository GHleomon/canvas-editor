import { IElement } from './Element'
import { BlockType } from '../dataset/enum/Block'

/**
 * 图表配置接口
 */
export interface IChartConfig {
  type: string // 图表类型（line, bar, pie 等）
  data: any // 图表数据
  options?: any // 完整的 ECharts 配置
  width?: number // 初始宽度
  height?: number // 初始高度
}

/**
 * 图表交互配置
 */
export interface IChartInteractionConfig {
  enableDragEdit: boolean // 启用拖拽编辑
  enableEmptyChartPlot: boolean // 启用空图表画点
  enableRegionDelete: boolean // 启用区域删除
  enableAutoFill: boolean // 启用自动补点
  shiftKeyRequired: boolean // 拖拽是否需要 Shift 键
  valueLimits?: {
    // 各曲线的数值限制
    [seriesIndex: number]: {
      lowLimit: number
      highLimit: number
    }
  }
}

/**
 * 图表数据管理配置
 */
export interface IChartDataConfig {
  timeInterval: number // 时间间隔（分钟）
  breakThreshold: number // 断点阈值（分钟）
  allowNull: boolean // 是否允许 null 值
  valueLimits?: {
    // 各曲线的数值限制
    [seriesName: string]: {
      lowLimit: number
      highLimit: number
    }
  }
}

/**
 * 图表元素接口（扩展 IElement）
 */
export interface IChartElement extends IElement {
  block?: {
    type: BlockType.ECHARTS // 使用 BlockType 枚举
    echartsBlock?: {
      chartId?: string
      config?: any
      width?: number
      height?: number
    }
  }
  value: string // 存储序列化的图表配置
  chartId?: string // 图表唯一标识符
  chartConfig?: {
    config: any // ECharts 配置对象
    width: number // 图表宽度（像素）
    height: number // 图表高度（像素）
    minWidth?: number // 最小宽度
    minHeight?: number // 最小高度
    printImageCache?: string // 打印模式缓存的图片 Base64
    interactionConfig?: IChartInteractionConfig // 交互功能配置
    dataConfig?: IChartDataConfig // 数据管理配置
  }
}

/**
 * 图表状态枚举
 */
export enum ChartState {
  PENDING = 'pending', // 等待初始化
  INITIALIZING = 'initializing', // 正在初始化
  ACTIVE = 'active', // 已激活（可见且已渲染）
  INACTIVE = 'inactive', // 未激活（不可见或已回收）
  ERROR = 'error', // 错误状态
  DISPOSED = 'disposed' // 已销毁
}

/**
 * 图表实例接口
 */
export interface IChartInstance {
  chartId: string
  element: IChartElement
  echartsInstance: any | null // ECharts 实例
  container: HTMLElement | null
  state: ChartState
  lastActiveTime: number // 最后活跃时间（用于回收判断）
  eventHandlers: Map<string, Function[]>
}

/**
 * 图表事件类型
 */
export type ChartEventType =
  | 'chartCreated'
  | 'chartUpdated'
  | 'chartRemoved'
  | 'chartError'
  | 'chartResized'

/**
 * 图表事件接口
 */
export interface IChartEvent {
  chartId: string
  type: ChartEventType
  data?: any
  error?: Error
}

/**
 * 图表事件处理器
 */
export type ChartEventHandler = (event: IChartEvent) => void

/**
 * 配置验证结果
 */
export interface IValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * 序列化的图表配置
 */
export interface ISerializedChartConfig {
  version: string // 配置版本
  chartType: string // 图表类型
  option: string // JSON 字符串化的 ECharts 配置
  checksum?: string // 配置校验和（可选）
}

/**
 * 视口回调接口
 */
export interface IViewportCallback {
  onEnter: () => void
  onLeave: () => void
}

/**
 * 图表错误日志
 */
export interface IChartErrorLog {
  timestamp: number
  chartId: string
  errorType: 'validation' | 'render' | 'resource' | 'serialization'
  message: string
  stack?: string
  context: {
    config?: any
    state?: ChartState
    operation?: string
  }
}
