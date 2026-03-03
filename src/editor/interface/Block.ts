import { BlockType } from '../dataset/enum/Block'

export interface IIFrameBlock {
  src?: string
  srcdoc?: string
}

export interface IVideoBlock {
  src: string
}

export interface IEChartsBlock {
  chartId?: string
  config?: any
  width?: number
  height?: number
}

export interface IBlock {
  type: BlockType
  iframeBlock?: IIFrameBlock
  videoBlock?: IVideoBlock
  echartsBlock?: IEChartsBlock
}
