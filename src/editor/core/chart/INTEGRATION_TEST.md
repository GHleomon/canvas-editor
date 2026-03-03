# ECharts 集成测试指南

## 测试目标

验证 ECharts 图表功能已成功集成到 canvas-editor 中。

## 测试步骤

### 1. 基础集成测试

```typescript
import Editor from '@hufe921/canvas-editor'

// 创建编辑器实例
const container = document.querySelector('#editor')
const editor = new Editor(container, [], {})

// 插入一个简单的折线图
const chartId = editor.insertChart({
  type: 'line',
  data: {
    xAxis: {
      type: 'category',
      data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: [150, 230, 224, 218, 135, 147, 260],
      type: 'line'
    }]
  },
  width: 600,
  height: 400
})

console.log('Chart created with ID:', chartId)
```

### 2. 图表更新测试

```typescript
// 更新图表数据
editor.updateChart(chartId, {
  series: [{
    data: [200, 250, 300, 280, 200, 180, 300],
    type: 'line'
  }]
})

console.log('Chart updated')
```

### 3. 获取图表实例测试

```typescript
// 获取 ECharts 实例
const chartInstance = editor.getChartInstance(chartId)

if (chartInstance) {
  console.log('Chart instance retrieved:', chartInstance)
  
  // 可以直接调用 ECharts API
  chartInstance.setOption({
    title: {
      text: 'Updated Chart'
    }
  })
}
```

### 4. 事件监听测试

```typescript
// 监听图表创建事件
editor.onChartEvent('chartCreated', (event) => {
  console.log('Chart created event:', event)
})

// 监听图表更新事件
editor.onChartEvent('chartUpdated', (event) => {
  console.log('Chart updated event:', event)
})

// 监听图表错误事件
editor.onChartEvent('chartError', (event) => {
  console.error('Chart error event:', event)
})
```

### 5. 图表删除测试

```typescript
// 删除图表
editor.removeChart(chartId)
console.log('Chart removed')
```

### 6. 打印模式测试

```typescript
// 进入打印模式（图表会转换为图片）
await editor.command.executePrint()

// 退出打印模式（图表恢复为交互式）
// 打印完成后会自动退出
```

## 预期结果

1. ✅ 图表成功插入到编辑器中
2. ✅ 图表正确渲染并显示
3. ✅ 图表数据更新后立即重新渲染
4. ✅ 可以获取到 ECharts 实例并调用其 API
5. ✅ 事件监听器正确触发
6. ✅ 图表可以被删除
7. ✅ 打印模式下图表转换为图片
8. ✅ 退出打印模式后图表恢复为交互式

## 常见问题

### 问题 1：图表不显示

**可能原因**：
- ECharts 库未正确加载
- 容器尺寸为 0
- 配置对象格式错误

**解决方案**：
- 检查浏览器控制台是否有错误信息
- 确保容器有明确的宽度和高度
- 验证配置对象是否符合 ECharts 规范

### 问题 2：图表更新不生效

**可能原因**：
- 图表 ID 不正确
- 图表未初始化（不在可视区域）

**解决方案**：
- 确认使用正确的 chartId
- 滚动到图表位置使其进入可视区域

### 问题 3：打印模式下图表显示为占位符

**可能原因**：
- 图表转图片失败
- 图表未完全渲染

**解决方案**：
- 等待图表完全渲染后再进入打印模式
- 检查浏览器控制台的错误信息

## 调试技巧

1. **启用详细日志**：
   ```typescript
   // 在浏览器控制台中查看详细日志
   localStorage.setItem('CANVAS_EDITOR_DEBUG', 'true')
   ```

2. **检查图表实例状态**：
   ```typescript
   const chartInstance = editor.getChartInstance(chartId)
   console.log('Chart instance:', chartInstance)
   console.log('Chart option:', chartInstance?.getOption())
   ```

3. **监听所有图表事件**：
   ```typescript
   ['chartCreated', 'chartUpdated', 'chartRemoved', 'chartError', 'chartResized'].forEach(event => {
     editor.onChartEvent(event, (e) => {
       console.log(`Event: ${event}`, e)
     })
   })
   ```

## 下一步

完成基础集成测试后，可以继续测试：
- 任务 9：事件系统完善
- 任务 12：错误处理
- 任务 13-14：性能优化和尺寸调整
