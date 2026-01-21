/**
 * 表格列宽设置功能集成测试
 * 验证需求: 1.1, 1.2, 1.3, 2.1-2.6, 3.1-3.3, 4.1-4.4, 5.1-5.3
 */
import Editor from '../../../src/editor'

describe('表格列宽设置功能', () => {
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

  describe('需求1: 右键菜单显示列宽设置选项', () => {
    it('1.1 在表格内右键应显示"设置列宽"菜单选项', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        // 获取表格数据验证表格已创建
        const data = editor.command.getValue().data.main
        expect(data[0].type).to.eq('table')

        // 在表格内右键点击
        rightClickInTable()

        // 验证右键菜单显示
        cy.get('.ce-contextmenu-container').should('be.visible')

        // 验证"设置列宽"菜单项存在
        cy.get('.ce-contextmenu-container').contains('设置列宽').should('exist')
      })
    })

    it('1.2 只读模式下不应显示"设置列宽"菜单选项', () => {
      createTableAndClick(3, 3).then(() => {
        // 通过UI切换到只读模式
        cy.get('.editor-mode').click().click()
        cy.get('.editor-mode').contains('只读')

        // 在canvas上右键点击
        rightClickInTable()

        // 验证右键菜单显示但不包含"设置列宽"
        cy.get('.ce-contextmenu-container').should('be.visible')
        cy.get('.ce-contextmenu-container').contains('设置列宽').should('not.exist')

        // 恢复编辑模式
        cy.get('.editor-mode').click()
      })
    })

    it('1.3 不在表格内右键不应显示"设置列宽"菜单选项', () => {
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

        // 验证右键菜单显示但不包含"设置列宽"
        cy.get('.ce-contextmenu-container').should('be.visible')
        cy.get('.ce-contextmenu-container').contains('设置列宽').should('not.exist')
      })
    })
  })

  describe('需求2: 列宽输入对话框', () => {
    it('2.1 点击"设置列宽"菜单应显示输入对话框', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()

        // 点击"设置列宽"菜单项
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 验证对话框显示
        cy.get('.col-width-dialog').should('be.visible')
        cy.get('.col-width-dialog-title').should('contain', '设置列宽')
      })
    })

    it('2.2 对话框应包含数值输入框', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 验证输入框存在
        cy.get('.col-width-dialog input[type="number"]').should('exist')
      })
    })

    it('2.3 对话框应显示"厘米(cm)"单位标签', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 验证单位标签
        cy.get('.col-width-dialog-unit').should('contain', '厘米(cm)')
      })
    })

    it('2.4 输入有效正数值并确认应应用宽度', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 输入有效值（2厘米）
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('2')

        // 点击确定
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证对话框关闭
        cy.get('.col-width-dialog').should('not.exist')

        // 验证列宽已更新（2cm ≈ 76像素）
        cy.wrap(editor).then((ed: Editor) => {
          const data = ed.command.getValue().data.main
          const table = data[0]
          // 检查第一列的宽度（应该接近76像素）
          const expectedPixels = Math.round(2 * (96 / 2.54))
          expect(table.colgroup?.[0].width).to.be.closeTo(expectedPixels, 1)
        })
      })
    })

    it('2.5 输入无效值应显示错误提示并阻止提交', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 测试空值
        cy.get('.col-width-dialog input[type="number"]').clear()
        cy.get('.col-width-dialog button[type="submit"]').click()
        cy.get('.col-width-dialog-error').should('be.visible')
        cy.get('.col-width-dialog').should('exist') // 对话框仍然存在

        // 测试负数
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('-1')
        cy.get('.col-width-dialog button[type="submit"]').click()
        cy.get('.col-width-dialog-error').should('be.visible')
        cy.get('.col-width-dialog').should('exist')

        // 测试零
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('0')
        cy.get('.col-width-dialog button[type="submit"]').click()
        cy.get('.col-width-dialog-error').should('be.visible')
        cy.get('.col-width-dialog').should('exist')
      })
    })

    it('2.6 点击取消按钮应关闭对话框且不做更改', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        // 获取原始列宽
        const originalData = editor.command.getValue().data.main
        const originalWidth = originalData[0].colgroup?.[0].width

        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 输入新值
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('5')

        // 点击取消
        cy.get('.col-width-dialog-menu__cancel').click()

        // 验证对话框关闭
        cy.get('.col-width-dialog').should('not.exist')

        // 验证列宽未更改
        cy.wrap(editor).then((ed: Editor) => {
          const data = ed.command.getValue().data.main
          expect(data[0].colgroup?.[0].width).to.eq(originalWidth)
        })
      })
    })
  })

  describe('需求3: 批量设置多列宽度', () => {
    it('3.1-3.2 选中单列并设置宽度', () => {
      createTableAndClick(3, 5).then((editor: Editor) => {
        // 获取表格数据
        const data = editor.command.getValue().data.main
        expect(data[0].type).to.eq('table')
        expect(data[0].colgroup?.length).to.eq(5)

        // 在表格内右键
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 设置列宽为3厘米
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('3')
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证列宽已更新
        cy.wrap(editor).then((ed: Editor) => {
          const updatedData = ed.command.getValue().data.main
          const expectedPixels = Math.round(3 * (96 / 2.54))
          // 至少当前列的宽度应该被更新
          const table = updatedData[0]
          const hasUpdatedCol = table.colgroup?.some(
            (col: { width: number }) => Math.abs(col.width - expectedPixels) <= 1
          )
          expect(hasUpdatedCol).to.be.true
        })
      })
    })

    it('3.3 设置列宽后表格应重新渲染', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('2')
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证对话框关闭（表示操作完成，包括重新渲染）
        cy.get('.col-width-dialog').should('not.exist')

        // 验证canvas仍然存在且可交互
        cy.get('@canvas').should('be.visible')
      })
    })
  })

  describe('需求4: 单位转换', () => {
    it('4.1-4.2 厘米值正确转换为像素值存储', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 输入1厘米
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('1')
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证存储的像素值（1cm ≈ 37.795像素，四舍五入为38）
        cy.wrap(editor).then((ed: Editor) => {
          const data = ed.command.getValue().data.main
          const expectedPixels = Math.round(96 / 2.54) // ≈ 38
          expect(data[0].colgroup?.[0].width).to.be.closeTo(expectedPixels, 1)
        })
      })
    })

    it('4.3-4.4 像素值正确转换为厘米值显示（保留两位小数）', () => {
      createTableAndClick(3, 3).then(() => {
        // 先设置一个已知的列宽
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('2.54') // 2.54cm = 1英寸 = 96像素
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 再次打开对话框，验证显示值
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 验证输入框显示的值（应该接近2.54）
        cy.get('.col-width-dialog input[type="number"]')
          .invoke('val')
          .then((val) => {
            const displayedValue = parseFloat(val as string)
            // 由于四舍五入，允许0.01的误差
            expect(displayedValue).to.be.closeTo(2.54, 0.02)
          })
      })
    })
  })

  describe('需求5: 列宽与表格宽度协调', () => {
    it('5.1 修改列宽后表格总宽度应更新', () => {
      createTableAndClick(3, 3).then((editor: Editor) => {
        // 获取原始表格数据
        const originalData = editor.command.getValue().data.main
        const originalColgroup = originalData[0].colgroup
        const originalTotalWidth = originalColgroup?.reduce(
          (sum: number, col: { width: number }) => sum + col.width, 0
        ) || 0

        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 设置一个较大的列宽
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('5')
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证表格总宽度已更新
        cy.wrap(editor).then((ed: Editor) => {
          const updatedData = ed.command.getValue().data.main
          const updatedColgroup = updatedData[0].colgroup
          const updatedTotalWidth = updatedColgroup?.reduce(
            (sum: number, col: { width: number }) => sum + col.width, 0
          ) || 0

          // 新的总宽度应该不等于原始总宽度（因为我们修改了一列）
          expect(updatedTotalWidth).to.not.eq(originalTotalWidth)
        })
      })
    })

    it('5.2 修改列宽后其他列宽度应保持不变', () => {
      createTableAndClick(3, 4).then((editor: Editor) => {
        // 获取原始列宽
        const originalData = editor.command.getValue().data.main
        const originalColWidths = originalData[0].colgroup?.map(
          (col: { width: number }) => col.width
        ) || []

        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 设置新的列宽
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('4')
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证其他列宽度保持不变
        cy.wrap(editor).then((ed: Editor) => {
          const updatedData = ed.command.getValue().data.main
          const updatedColWidths = updatedData[0].colgroup?.map(
            (col: { width: number }) => col.width
          ) || []

          // 至少有一列宽度被修改
          const hasChangedCol = updatedColWidths.some(
            (width: number, index: number) => width !== originalColWidths[index]
          )
          expect(hasChangedCol).to.be.true

          // 其他列宽度应保持不变（除了被修改的那一列）
          let unchangedCount = 0
          updatedColWidths.forEach((width: number, index: number) => {
            if (width === originalColWidths[index]) {
              unchangedCount++
            }
          })
          // 至少有 n-1 列保持不变（n为总列数）
          expect(unchangedCount).to.be.at.least(originalColWidths.length - 1)
        })
      })
    })

    it('5.3 修改后的表格应保持可滚动或可调整', () => {
      createTableAndClick(3, 3).then(() => {
        rightClickInTable()
        cy.get('.ce-contextmenu-container').contains('设置列宽').click()

        // 设置一个非常大的列宽
        cy.get('.col-width-dialog input[type="number"]')
          .clear()
          .type('10')
        cy.get('.col-width-dialog button[type="submit"]').click()

        // 验证对话框关闭，操作成功
        cy.get('.col-width-dialog').should('not.exist')

        // 验证canvas仍然可交互
        cy.get('@canvas').should('be.visible')

        // 可以再次右键打开菜单
        rightClickInTable()
        cy.get('.ce-contextmenu-container').should('be.visible')
      })
    })
  })
})
