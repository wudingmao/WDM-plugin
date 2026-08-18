import YAML from 'yaml'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 插件根目录（components 的上一级）
const _path = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

export default class Config {
  /** 获取配置（不存在时自动从默认配置生成） */
  static getConfig(name) {
    const file = this.getFilePath(name)
    if (!fs.existsSync(file)) {
      this.copyDefault(name)
    }
    return YAML.parse(fs.readFileSync(file, 'utf8'))
  }

  /** 保存配置 */
  static setConfig(name, data) {
    const file = this.getFilePath(name)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, YAML.stringify(data))
  }

  /** 获取用户配置文件路径 */
  static getFilePath(name) {
    return path.join(_path, 'config', 'config', `${name}.yaml`)
  }

  /** 获取默认配置文件路径 */
  static getDefaultPath(name) {
    return path.join(_path, 'config', 'default_config', `${name}.yaml`)
  }

  /** 复制默认配置为运行配置 */
  static copyDefault(name) {
    const defaultFile = this.getDefaultPath(name)
    const configFile = this.getFilePath(name)
    if (fs.existsSync(defaultFile) && !fs.existsSync(configFile)) {
      fs.mkdirSync(path.dirname(configFile), { recursive: true })
      fs.copyFileSync(defaultFile, configFile)
      if (typeof logger !== 'undefined') {
        logger.mark(`[WMD-plugin] 已生成配置文件 config/config/${name}.yaml`)
      }
    }
  }
}
