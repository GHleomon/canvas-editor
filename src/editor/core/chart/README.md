# ECharts 动态图表区域模块

本模块为 canvas-editor 提供 ECharts 图表集成功能。

## 目录结构

```
chart/
├── ChartManager.ts              # 图表管理器（核心协调器）
├── ChartLifecycleManager.ts     # 生命周期管理器
├── ViewportObserver.ts          # 视口观察器
├── ChartConfigSerializer.ts     # 配置序列化器
├── ChartImageConverter.ts       # 图片转换器
├── ChartInteractionModule.ts    # 交互功能模块
├── index.ts                     # 模块导出
└── README.md                    # 本文件
```

## 核心组件

### ChartManager
图表管理中心，负责：
- 图表的创建、更新、删除
- 协调其他子模块
- 事件管理和触发

### ChartLifecycleManager
管理图表生命周期：
- 初始化和销毁 ECharts 实例
- 延迟加载和资源回收
- 尺寸调整

### ViewportObserver
监听图表可见性：
- 使用 IntersectionObserver API
- 触发进入/离开可视区域回调

### ChartConfigSerializer
处理配置序列化：
- 序列化和反序列化 ECharts 配置
- 验证配置格式
- 版本迁移

### ChartImageConverter
打印模式支持：
- 将图表转换为图片
- 批量转换
- 创建图片元素

### ChartInteractionModule
交互功能（集成自 ChartTestECharts）：
- 拖拽编辑数据点
- 空图表画点
- 数据点删除/恢复
- 区域删除
- 批量追加和延伸曲线

## 使用方式

```typescript
import { ChartManager } from './core/chart'

// 在 Draw 类中初始化
const chartManager = new ChartManager(draw)

// 插入图表
const chartId = chartManager.insertChart({
  type: 'line',
  data: [...],
  width: 600,
  height: 400
})

// 更新图表
chartManager.updateChart(chartId, newData)

// 获取 ECharts 实例
const chart = chartManager.getChartInstance(chartId)
```

## 开发状态

当前所有类都已创建骨架，具体实现将在后续任务中完成。
