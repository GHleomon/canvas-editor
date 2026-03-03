import {
  IValidationResult,
  ISerializedChartConfig
} from '../../interface/Chart'

/**
 * 图表配置序列化器
 * 处理图表配置的序列化和反序列化
 */
export class ChartConfigSerializer {
  private readonly VERSION = '1.0.0'

  /**
   * 序列化配置（移除不可序列化的属性）
   */
  public serialize(config: any): string {
    try {
      // 清理不可序列化的属性
      const sanitized = this.sanitizeConfig(config)

      // 创建序列化配置对象
      const serialized: ISerializedChartConfig = {
        version: this.VERSION,
        chartType: config.type || 'unknown',
        option: JSON.stringify(sanitized)
      }

      return JSON.stringify(serialized)
    } catch (error) {
      console.error('Failed to serialize chart config:', error)
      throw new Error(`Serialization failed: ${error}`)
    }
  }

  /**
   * 反序列化配置
   */
  public deserialize(json: string): any {
    try {
      const serialized: ISerializedChartConfig = JSON.parse(json)

      // 检查版本兼容性
      if (serialized.version !== this.VERSION) {
        console.warn(
          `Config version mismatch: ${serialized.version} vs ${this.VERSION}`
        )
        // 尝试迁移
        const migrated = this.migrate(serialized, serialized.version)
        return JSON.parse(migrated.option)
      }

      return JSON.parse(serialized.option)
    } catch (error) {
      console.error('Failed to deserialize chart config:', error)
      throw new Error(`Deserialization failed: ${error}`)
    }
  }

  /**
   * 验证配置格式
   */
  public validate(config: any): IValidationResult {
    const errors: string[] = []

    // 检查必需字段
    if (!config) {
      errors.push('Config is null or undefined')
      return { valid: false, errors }
    }

    // 检查图表类型
    if (!config.type && !config.series) {
      errors.push('Missing chart type or series')
    }

    // 检查数据
    if (config.series) {
      if (!Array.isArray(config.series)) {
        errors.push('Series must be an array')
      } else {
        config.series.forEach((series: any, index: number) => {
          if (!series.data) {
            errors.push(`Series ${index} is missing data`)
          }
        })
      }
    }

    // 检查尺寸
    if (config.width !== undefined && typeof config.width !== 'number') {
      errors.push('Width must be a number')
    }

    if (config.height !== undefined && typeof config.height !== 'number') {
      errors.push('Height must be a number')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * 迁移旧版本配置
   */
  public migrate(config: any, fromVersion: string): ISerializedChartConfig {
    console.log(`Migrating config from version ${fromVersion} to ${this.VERSION}`)

    // 目前只有一个版本，直接返回
    // 未来版本可以在这里添加迁移逻辑
    return {
      version: this.VERSION,
      chartType: config.chartType || 'unknown',
      option: config.option || '{}'
    }
  }

  /**
   * 清理不可序列化的属性
   */
  private sanitizeConfig(config: any): any {
    if (config === null || config === undefined) {
      return config
    }

    // 处理基本类型
    if (typeof config !== 'object') {
      return config
    }

    // 处理数组
    if (Array.isArray(config)) {
      return config.map(item => this.sanitizeConfig(item))
    }

    // 处理对象
    const sanitized: any = {}
    for (const key in config) {
      if (!Object.prototype.hasOwnProperty.call(config, key)) continue

      const value = config[key]

      // 跳过函数
      if (typeof value === 'function') {
        console.warn(`Skipping function property: ${key}`)
        continue
      }

      // 跳过 Symbol
      if (typeof value === 'symbol') {
        console.warn(`Skipping symbol property: ${key}`)
        continue
      }

      // 跳过 undefined
      if (value === undefined) {
        continue
      }

      // 递归处理嵌套对象
      if (typeof value === 'object' && value !== null) {
        // 检测循环引用
        try {
          JSON.stringify(value)
          sanitized[key] = this.sanitizeConfig(value)
        } catch (error) {
          console.warn(`Skipping circular reference property: ${key}`)
          continue
        }
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }

  /**
   * 获取当前版本
   */
  public getVersion(): string {
    return this.VERSION
  }
}
