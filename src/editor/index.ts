import './assets/css/index.css'
import { version } from '../../package.json'
import { IEditorData, IEditorOption, IEditorResult } from './interface/Editor'
import { IElement } from './interface/Element'
import { Draw } from './core/draw/Draw'
import { Command } from './core/command/Command'
import { CommandAdapt } from './core/command/CommandAdapt'
import { Listener } from './core/listener/Listener'
import { RowFlex } from './dataset/enum/Row'
import {
  FlexDirection,
  ImageDisplay,
  LocationPosition
} from './dataset/enum/Common'
import { ElementType } from './dataset/enum/Element'
import { formatElementList } from './utils/element'
import { Register } from './core/register/Register'
import { ContextMenu } from './core/contextmenu/ContextMenu'
import {
  IContextMenuContext,
  IRegisterContextMenu
} from './interface/contextmenu/ContextMenu'
import {
  EditorComponent,
  EditorZone,
  EditorMode,
  PageMode,
  PaperDirection,
  WordBreak,
  RenderMode
} from './dataset/enum/Editor'
import { EDITOR_CLIPBOARD, EDITOR_COMPONENT } from './dataset/constant/Editor'
import { IWatermark } from './interface/Watermark'
import {
  ControlComponent,
  ControlIndentation,
  ControlState,
  ControlType
} from './dataset/enum/Control'
import { INavigateInfo } from './core/draw/interactive/Search'
import { Shortcut } from './core/shortcut/Shortcut'
import { KeyMap } from './dataset/enum/KeyMap'
import { BlockType } from './dataset/enum/Block'
import { IBlock } from './interface/Block'
import { ILang } from './interface/i18n/I18n'
import { VerticalAlign } from './dataset/enum/VerticalAlign'
import { TableBorder, TdBorder, TdSlash } from './dataset/enum/table/Table'
import { MaxHeightRatio, NumberType } from './dataset/enum/Common'
import { TitleLevel } from './dataset/enum/Title'
import { ListStyle, ListType } from './dataset/enum/List'
import { ICatalog, ICatalogItem } from './interface/Catalog'
import { Plugin } from './core/plugin/Plugin'
import { UsePlugin } from './interface/Plugin'
import { EventBus } from './core/event/eventbus/EventBus'
import { EventBusMap } from './interface/EventBus'
import { IRangeStyle } from './interface/Listener'
import { Override } from './core/override/Override'
import { LETTER_CLASS } from './dataset/constant/Common'
import { INTERNAL_CONTEXT_MENU_KEY } from './dataset/constant/ContextMenu'
import { IRange } from './interface/Range'
import { deepClone, splitText } from './utils'
import {
  createDomFromElementList,
  getElementListByHTML,
  getTextFromElementList,
  type IGetElementListByHTMLOption
} from './utils/element'
import { BackgroundRepeat, BackgroundSize } from './dataset/enum/Background'
import { TextDecorationStyle } from './dataset/enum/Text'
import { mergeOption } from './utils/option'
import { LineNumberType } from './dataset/enum/LineNumber'
import { AreaMode } from './dataset/enum/Area'
import { IBadge } from './interface/Badge'
import { WatermarkType } from './dataset/enum/Watermark'
import { INTERNAL_SHORTCUT_KEY } from './dataset/constant/Shortcut'
import { ChartState, IChartConfig, ChartEventType, ChartEventHandler } from './interface/Chart'
import { ChartManager } from './core/chart/ChartManager'

export default class Editor {
  public command: Command
  public version: string
  public listener: Listener
  public eventBus: EventBus<EventBusMap>
  public override: Override
  public register: Register
  public destroy: () => void
  public use: UsePlugin
  
  private draw: Draw
  private chartManager: ChartManager

  constructor(
    container: HTMLDivElement,
    data: IEditorData | IElement[],
    options: IEditorOption = {}
  ) {
    // 合并配置
    const editorOptions = mergeOption(options)
    // 数据处理
    data = deepClone(data)
    let headerElementList: IElement[] = []
    let mainElementList: IElement[] = []
    let footerElementList: IElement[] = []
    if (Array.isArray(data)) {
      mainElementList = data
    } else {
      headerElementList = data.header || []
      mainElementList = data.main
      footerElementList = data.footer || []
    }
    const pageComponentData = [
      headerElementList,
      mainElementList,
      footerElementList
    ]
    pageComponentData.forEach(elementList => {
      formatElementList(elementList, {
        editorOptions,
        isForceCompensation: true
      })
    })
    // 版本
    this.version = version
    // 监听
    this.listener = new Listener()
    // 事件
    this.eventBus = new EventBus<EventBusMap>()
    // 重写
    this.override = new Override()
    // 启动
    this.draw = new Draw(
      container,
      editorOptions,
      {
        header: headerElementList,
        main: mainElementList,
        footer: footerElementList
      },
      this.listener,
      this.eventBus,
      this.override
    )
    // 命令
    this.command = new Command(new CommandAdapt(this.draw))
    // 菜单
    const contextMenu = new ContextMenu(this.draw, this.command)
    // 快捷键
    const shortcut = new Shortcut(this.draw, this.command)
    // 注册
    this.register = new Register({
      contextMenu,
      shortcut,
      i18n: this.draw.getI18n()
    })
    // 图表管理器
    this.chartManager = new ChartManager(this.draw)
    // 注册销毁方法
    this.destroy = () => {
      this.chartManager.dispose()
      this.draw.destroy()
      shortcut.removeEvent()
      contextMenu.removeEvent()
      this.eventBus.dangerouslyClearAll()
    }
    // 插件
    const plugin = new Plugin(this)
    this.use = plugin.use.bind(plugin)
  }

  /**
   * 插入图表
   * @param config - 图表配置对象
   * @returns 图表唯一标识符
   */
  public insertChart(config: IChartConfig): string {
    const chartId = this.chartManager.insertChart(config)
    this.draw.render({
      isSetCursor: false,
      isCompute: false
    })
    return chartId
  }

  /**
   * 更新图表数据
   * @param chartId - 图表唯一标识符
   * @param data - 新的图表数据
   */
  public updateChart(chartId: string, data: any): void {
    this.chartManager.updateChart(chartId, data)
  }

  /**
   * 获取图表实例
   * @param chartId - 图表唯一标识符
   * @returns ECharts 实例或 null
   */
  public getChartInstance(chartId: string): any | null {
    return this.chartManager.getChartInstance(chartId)
  }

  /**
   * 删除图表
   * @param chartId - 图表唯一标识符
   */
  public removeChart(chartId: string): void {
    this.chartManager.removeChart(chartId)
    this.draw.render({
      isSetCursor: false,
      isCompute: false
    })
  }

  /**
   * 注册图表事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理函数
   */
  public onChartEvent(event: ChartEventType, handler: ChartEventHandler): void {
    this.chartManager.on(event, handler)
  }

  /**
   * 注销图表事件监听器
   * @param event - 事件类型
   * @param handler - 事件处理函数
   */
  public offChartEvent(event: ChartEventType, handler: ChartEventHandler): void {
    this.chartManager.off(event, handler)
  }
}

// 对外方法
export {
  splitText,
  createDomFromElementList,
  getElementListByHTML,
  getTextFromElementList
}

// 对外常量
export {
  EDITOR_COMPONENT,
  LETTER_CLASS,
  INTERNAL_CONTEXT_MENU_KEY,
  INTERNAL_SHORTCUT_KEY,
  EDITOR_CLIPBOARD
}

// 对外枚举
export {
  Editor,
  RowFlex,
  VerticalAlign,
  EditorZone,
  EditorMode,
  ElementType,
  ControlType,
  EditorComponent,
  PageMode,
  RenderMode,
  ImageDisplay,
  Command,
  KeyMap,
  BlockType,
  PaperDirection,
  TableBorder,
  TdBorder,
  TdSlash,
  MaxHeightRatio,
  NumberType,
  TitleLevel,
  ListType,
  ListStyle,
  WordBreak,
  ControlIndentation,
  ControlComponent,
  BackgroundRepeat,
  BackgroundSize,
  TextDecorationStyle,
  LineNumberType,
  LocationPosition,
  AreaMode,
  ControlState,
  FlexDirection,
  WatermarkType,
  ChartState
}

// 对外类型
export type {
  IElement,
  IEditorData,
  IEditorOption,
  IEditorResult,
  IContextMenuContext,
  IRegisterContextMenu,
  IWatermark,
  INavigateInfo,
  IBlock,
  ILang,
  ICatalog,
  ICatalogItem,
  IRange,
  IRangeStyle,
  IBadge,
  IGetElementListByHTMLOption
}

// 图表相关类型
export type {
  IChartConfig,
  IChartInteractionConfig,
  IChartDataConfig,
  IChartElement,
  IChartInstance,
  ChartEventType,
  IChartEvent,
  ChartEventHandler,
  IValidationResult,
  ISerializedChartConfig,
  IViewportCallback,
  IChartErrorLog
} from './interface/Chart'
