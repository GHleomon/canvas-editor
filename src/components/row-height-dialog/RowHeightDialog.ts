/**
 * 行高设置对话框组件
 * 用于设置表格行的高度（以厘米为单位）
 */
import { EditorComponent, EDITOR_COMPONENT } from '../../editor'
import { cmToPixels, pixelsToCm } from '../../editor/utils/unit'
import { validateRowHeight } from '../../editor/utils/validator'
import './row-height-dialog.css'

/**
 * 行高对话框配置选项
 */
export interface IRowHeightDialogOptions {
  /** 默认值（像素） */
  defaultValuePixels?: number
  /** 确认回调，参数为像素值 */
  onConfirm: (heightPixels: number) => void
  /** 取消回调 */
  onCancel?: () => void
  /** 关闭回调 */
  onClose?: () => void
}

/**
 * 行高设置对话框类
 */
export class RowHeightDialog {
  private options: IRowHeightDialogOptions
  private mask: HTMLDivElement | null
  private container: HTMLDivElement | null
  private input: HTMLInputElement | null
  private errorDiv: HTMLDivElement | null

  constructor(options: IRowHeightDialogOptions) {
    this.options = options
    this.mask = null
    this.container = null
    this.input = null
    this.errorDiv = null
    this._render()
  }

  /**
   * 渲染对话框
   */
  private _render(): void {
    const { defaultValuePixels, onConfirm, onCancel, onClose } = this.options

    // 计算默认值（厘米）
    const defaultValueCm = defaultValuePixels
      ? pixelsToCm(defaultValuePixels)
      : ''

    // 渲染遮罩层
    const mask = document.createElement('div')
    mask.classList.add('row-height-dialog-mask')
    mask.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)
    document.body.append(mask)

    // 渲染容器
    const container = document.createElement('div')
    container.classList.add('row-height-dialog-container')
    container.setAttribute(EDITOR_COMPONENT, EditorComponent.COMPONENT)

    // 弹窗主体
    const dialogContainer = document.createElement('div')
    dialogContainer.classList.add('row-height-dialog')
    container.append(dialogContainer)

    // 标题容器
    const titleContainer = document.createElement('div')
    titleContainer.classList.add('row-height-dialog-title')

    // 标题文本
    const titleSpan = document.createElement('span')
    titleSpan.append(document.createTextNode('设置行高'))

    // 关闭按钮
    const titleClose = document.createElement('i')
    titleClose.onclick = () => {
      if (onClose) {
        onClose()
      }
      this._dispose()
    }

    titleContainer.append(titleSpan)
    titleContainer.append(titleClose)
    dialogContainer.append(titleContainer)

    // 选项容器
    const optionContainer = document.createElement('div')
    optionContainer.classList.add('row-height-dialog-option')

    // 输入项容器
    const optionItemContainer = document.createElement('div')
    optionItemContainer.classList.add('row-height-dialog-option__item')

    // 标签
    const optionLabel = document.createElement('span')
    optionLabel.append(document.createTextNode('行高：'))
    optionItemContainer.append(optionLabel)

    // 输入框
    const input = document.createElement('input')
    input.type = 'number'
    input.step = '0.01'
    input.min = '0.01'
    input.placeholder = '请输入行高'
    input.value = defaultValueCm ? String(defaultValueCm) : ''
    this.input = input

    // 输入框变化时清除错误提示
    input.oninput = () => {
      this._clearError()
    }

    optionItemContainer.append(input)

    // 单位标签
    const unitLabel = document.createElement('span')
    unitLabel.classList.add('row-height-dialog-unit')
    unitLabel.append(document.createTextNode('厘米(cm)'))
    optionItemContainer.append(unitLabel)

    optionContainer.append(optionItemContainer)

    // 错误提示容器
    const errorDiv = document.createElement('div')
    errorDiv.classList.add('row-height-dialog-error')
    this.errorDiv = errorDiv
    optionContainer.append(errorDiv)

    dialogContainer.append(optionContainer)

    // 按钮容器
    const menuContainer = document.createElement('div')
    menuContainer.classList.add('row-height-dialog-menu')

    // 取消按钮
    const cancelBtn = document.createElement('button')
    cancelBtn.classList.add('row-height-dialog-menu__cancel')
    cancelBtn.append(document.createTextNode('取消'))
    cancelBtn.type = 'button'
    cancelBtn.onclick = () => {
      if (onCancel) {
        onCancel()
      }
      this._dispose()
    }
    menuContainer.append(cancelBtn)

    // 确认按钮
    const confirmBtn = document.createElement('button')
    confirmBtn.append(document.createTextNode('确定'))
    confirmBtn.type = 'submit'
    confirmBtn.onclick = () => {
      this._handleConfirm(onConfirm)
    }
    menuContainer.append(confirmBtn)

    dialogContainer.append(menuContainer)

    // 渲染到页面
    document.body.append(container)
    this.container = container
    this.mask = mask

    // 聚焦输入框
    setTimeout(() => {
      input.focus()
      input.select()
    }, 0)
  }

  /**
   * 处理确认操作
   */
  private _handleConfirm(onConfirm: (heightPixels: number) => void): void {
    if (!this.input) return

    const value = this.input.value

    // 验证输入
    const validation = validateRowHeight(value)
    if (!validation.valid) {
      this._showError(validation.error || '输入无效')
      return
    }

    // 转换为像素值
    const heightCm = parseFloat(value)
    const heightPixels = cmToPixels(heightCm)

    // 调用确认回调
    onConfirm(heightPixels)
    this._dispose()
  }

  /**
   * 显示错误提示
   */
  private _showError(message: string): void {
    if (this.errorDiv) {
      this.errorDiv.textContent = message
      this.errorDiv.classList.add('visible')
    }
    if (this.input) {
      this.input.classList.add('error')
    }
  }

  /**
   * 清除错误提示
   */
  private _clearError(): void {
    if (this.errorDiv) {
      this.errorDiv.textContent = ''
      this.errorDiv.classList.remove('visible')
    }
    if (this.input) {
      this.input.classList.remove('error')
    }
  }

  /**
   * 销毁对话框
   */
  private _dispose(): void {
    this.mask?.remove()
    this.container?.remove()
    this.mask = null
    this.container = null
    this.input = null
    this.errorDiv = null
  }
}
