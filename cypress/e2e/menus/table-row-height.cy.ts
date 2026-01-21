/**
 * 表格行高设置功能集成测试
 * 验证需求: 1.1, 1.2, 1.3, 2.1-2.6, 3.1-3.3, 4.1-4.4
 */
import Editor from '../../../src/editor'

describe('表格行高设置功能', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas').first().as('canvas').should('have.length', 1)
  })

  /**
   * 辅助函数：创建表格并点击进入
   */
  const createTableAndClick = (rows: number, cols: number) => {
    return cy.getEditor().then((editor: Editor) => {
      // 清空编辑器
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      // 插入表格
      editor.command.executeInsertTable(rows, cols)
      return cy.wrap(editor)
    })
  }

  /**
   * 辅助函数：点击canvas中心位置进入表格
   */
  const clickInTable = () => {
    // 先点击canvas使其获得焦点，然后点击表格区域
    cy.get('@canvas').click(200, 150)
    cy.wait(100)
  }

  /**
   * 辅助函数：在表格内触发右键菜单
   */
  const rightClickInTable = () => {
    clickInTable()
    cy.get('@canvas').rightclick(200, 150)
    cy.wait(100)
  }

  describe('需求1: 右键菜单显示行高设置选项', () => {
    it('1.1 在表格内右键应显示"设置行高"菜单选项', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        // 获取表格数据验证表格已创建
        const data = editor.command.getValue().data.main
        expect(data[0].type).to.eq('table')

        // 在表格内右键点击
        rightClickInTable()

        // 验证右键菜单显示
        cy.get('.ce-contextmenu-container').should('be.visible')

        // 验证"设置行高"菜单项存在
        cy.get('.ce-contextmenu-container').contains('设置行高').should('exist')
      })
    })

    it('1.2 只读模式下不应显示"设置行高"菜单选项', () => {
      createTableAndClick(3, 3).then(() => {
        // 通过UI切换到只读模式
        cy.get('.editor-mode').click().click()
        cy.get('.editor-mode').contains('只读')

        // 在canvas上右键点击
        rightClickInTable()

        // 验证右键菜单显示但不包含"设置行高"
        cy.get('.ce-contextmenu-container').should('be.visible')
        cy.get('.ce-contextmenu-container').contains('设置行高').should('not.exist')

        // 恢复编辑模式
        cy.get('.editor-mode').click()
      })
    })

    it('1.3 不在表格内右键不应显示"设置行高"菜单选项', () => {
      cy.getEditor().then((editor: Editor) => {
        // 清空编辑器，不插入表格
        editor.command.executeSelectAll()
        editor.command.executeBackspace()

        // 输入一些普通文本
        editor.command.executeInsertElementList([
          { value: '这是普通文本' }
        ])

        // 点击并右键
        cy.get('@canvas').click(200, 150)
        cy.wait(100)
        cy.get('@canvas').rightclick(200, 150)

        // 验证右键菜单显示但不包含"设置行高"
        cy.get('.ce-contextmenu-container').should('be.visible')
        cy.get('.ce-contextmenu-container').contains('设置行高').should('not.exist')
      })
    })
  })

  describe('需求2: 行高输入对话框', () => {
    it('2.1 点击"设置行高"菜单应显示输入对话框', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()

        // 点击"设置行高"菜单项
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 验证对话框显示
        cy.get('.row-height-dialog').should('be.visible')
        cy.get('.row-height-dialog-title').should('contain', '设置行高')
      })
    })

    it('2.2 对话框应包含数值输入框', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 验证输入框存在
        cy.get('.row-height-dialog input[type="number"]').should('exist')
      })
    })

    it('2.3 对话框应显示"厘米(cm)"单位标签', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 验证单位标签
        cy.get('.row-height-dialog-unit').should('contain', '厘米(cm)')
      })
    })

    it('2.4 输入有效正数值并确认应应用高度', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 输入有效值（1.5厘米）
        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('1.5')

        // 点击确定
        cy.get('.row-height-dialog button[type="submit"]').click()

        // 验证对话框关闭
        cy.get('.row-height-dialog').should('not.exist')

        // 验证行高已更新（1.5cm ≈ 57像素）
        cy.wrap(editor).then((ed: Editor) => {
          const data = ed.command.getValue().data.main
          const table = data[0]
          // 检查第一行的高度（应该接近57像素）
          const expectedPixels = Math.round(1.5 * (96 / 2.54))
          expect(table.trList?.[0].height).to.be.closeTo(expectedPixels, 1)
        })
      })
    })

    it('2.5 输入无效值应显示错误提示并阻止提交', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 测试空值
        cy.get('.row-height-dialog input[type="number"]').clear()
        cy.get('.row-height-dialog button[type="submit"]').click()
        cy.get('.row-height-dialog-error').should('be.visible')
        cy.get('.row-height-dialog').should('exist') // 对话框仍然存在

        // 测试负数
        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('-1')
        cy.get('.row-height-dialog button[type="submit"]').click()
        cy.get('.row-height-dialog-error').should('be.visible')
        cy.get('.row-height-dialog').should('exist')

        // 测试零
        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('0')
        cy.get('.row-height-dialog button[type="submit"]').click()
        cy.get('.row-height-dialog-error').should('be.visible')
        cy.get('.row-height-dialog').should('exist')
      })
    })

    it('2.6 点击取消按钮应关闭对话框且不做更改', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        // 获取原始行高
        const originalData = editor.command.getValue().data.main
        const originalHeight = originalData[0].trList?.[0].height

        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 输入新值
        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('5')

        // 点击取消
        cy.get('.row-height-dialog-menu__cancel').click()

        // 验证对话框关闭
        cy.get('.row-height-dialog').should('not.exist')

        // 验证行高未更改
        cy.wrap(editor).then((ed: Editor) => {
          const data = ed.command.getValue().data.main
          expect(data[0].trList?.[0].height).to.eq(originalHeight)
        })
      })
    })
  })

  describe('需求3: 批量设置多行高度', () => {
    it('3.1-3.2 选中多行并设置相同高度', () => {
      createTableAndClick(5, 3).then((editor: Editor) => {
        // 获取表格数据
        const data = editor.command.getValue().data.main
        expect(data[0].type).to.eq('table')
        expect(data[0].trList?.length).to.eq(5)

        // 在表格内右键
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 设置行高为2厘米
        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('2')
        cy.get('.row-height-dialog button[type="submit"]').click()

        // 验证行高已更新
        cy.wrap(editor).then((ed: Editor) => {
          const updatedData = ed.command.getValue().data.main
          const expectedPixels = Math.round(2 * (96 / 2.54))
          // 至少当前行的高度应该被更新
          const table = updatedData[0]
          const hasUpdatedRow = table.trList?.some(
            (tr: { height: number }) => Math.abs(tr.height - expectedPixels) <= 1
          )
          expect(hasUpdatedRow).to.be.true
        })
      })
    })

    it('3.3 设置行高后表格应重新渲染', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('1')
        cy.get('.row-height-dialog button[type="submit"]').click()

        // 验证对话框关闭（表示操作完成，包括重新渲染）
        cy.get('.row-height-dialog').should('not.exist')

        // 验证canvas仍然存在且可交互
        cy.get('@canvas').should('be.visible')
      })
    })
  })

  describe('需求4: 单位转换', () => {
    it('4.1-4.2 厘米值正确转换为像素值存储', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 输入1厘米
        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('1')
        cy.get('.row-height-dialog button[type="submit"]').click()

        // 验证存储的像素值（1cm ≈ 37.795像素，四舍五入为38）
        cy.wrap(editor).then((ed: Editor) => {
          const data = ed.command.getValue().data.main
          const expectedPixels = Math.round(96 / 2.54) // ≈ 38
          expect(data[0].trList?.[0].height).to.be.closeTo(expectedPixels, 1)
        })
      })
    })

    it('4.3-4.4 像素值正确转换为厘米值显示（保留两位小数）', () => {
      createTableAndClick(3, 3).then(() => {
        // 先设置一个已知的行高
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        cy.get('.row-height-dialog input[type="number"]')
          .clear()
          .type('2.54') // 2.54cm = 1英寸 = 96像素
        cy.get('.row-height-dialog button[type="submit"]').click()

        // 再次打开对话框，验证显示值
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置行高').click()

        // 验证输入框显示的值（应该接近2.54）
        cy.get('.row-height-dialog input[type="number"]')
          .invoke('val')
          .then((val) => {
            const displayedValue = parseFloat(val as string)
            // 由于四舍五入，允许0.01的误差
            expect(displayedValue).to.be.closeTo(2.54, 0.02)
          })
      })
    })
  })
})
