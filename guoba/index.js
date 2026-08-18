import pluginInfo from "./pluginInfo.js"
import configInfo from "./configInfo.js"
import { buildSchemas } from "./schemas/index.js"

export function supportGuoba() {
  return {
    pluginInfo,
    configInfo: {
      // schemas 在 supportGuoba() 被调用时构建，此时 Bot 已登录，
      // Select 群号选项才能动态获取到群列表
      schemas: buildSchemas(),
      ...configInfo,
    },
  }
}
