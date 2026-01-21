import { ControlComponent } from '../../../../dataset/enum/Control'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption
} from '../../../../interface/Control'
import { IElement } from '../../../../interface/Element'
import { Control } from '../Control'

export class RadioControl implements IControlInstance {
  private element: IElement
  private control: Control

  constructor(element: IElement, control: Control) {
    this.element = element
    this.control = control
  }

  public setElement(element: IElement) {
    this.element = element
  }

  public getElement(): IElement {
    return this.element
  }

  public getCode(): string | null {
    return this.element.control?.code || null
  }

  public getValue(): IElement[] {
    return [this.element]
  }

  public setSelect(
    codes: string[],
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ) {
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return
    }

    // 获取上下文
    const elementList = context.elementList || this.control.getElementList()
    const currentGroupId = this.element.control?.groupId
    
    // 获取当前点击传进来的 ID
    let targetCode: string | null = codes[0] 

    if (!currentGroupId) return

    // =========================================================
    // 【新增逻辑】：反选/取消选中判断
    // =========================================================
    // 如果当前元素存在 radio 属性，且已经是选中状态 (value === true)
    // 并且点击的 code 和当前元素的 code 一致
    if (
        this.element.radio && 
        this.element.radio.value === true && 
        this.element.radio.code === targetCode
    ) {
        // 将目标 Code 设为 null，表示“我不选任何东西”
        // 接下来的循环会将该组所有 radio.value 设为 false
        targetCode = null 
    }
    // =========================================================

    // 全局扫描：寻找所有 groupId 相同的 radio 元素并更新状态
    for (let i = 0; i < elementList.length; i++) {
      const el = elementList[i]

      // 匹配 GroupId
      if (
        el.control?.groupId === currentGroupId &&
        (el.type === 'radio' || el.controlComponent === ControlComponent.RADIO)
      ) {
        if (el.radio) {
          // 互斥逻辑：
          // 如果 targetCode 是 null (反选情况)，这里恒为 false -> 全部熄灭
          // 如果 targetCode 有值，只有匹配的那个为 true -> 单选互斥
          const shouldSelect = targetCode !== null && el.radio.code === targetCode
          
          el.radio.value = shouldSelect

          // 同步 control 属性，确保 getValue 获取数据正确
          if (shouldSelect) {
            el.control.code = targetCode
          } else {
             // 如果取消选中，为了数据纯洁性，也可以选择将 control.code 清空
             // el.control.code = null; 
          }
        }
      }
    }

    // 触发重绘
    this.control.repaintControl({ isSetCursor: false })
    this.control.emitControlContentChange({ context })
  }

  public setValue(): number {
    return -1
  }

  public keydown(): number | null {
    return null
  }

  public cut(): number {
    return -1
  }
}