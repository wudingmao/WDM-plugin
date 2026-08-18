import Config from "../../components/Config.js"
import bfyl from "./bfyl.js"
import tarot from "./tarot.js"
import holiday from "./holiday.js"
import rss from "./rss.js"
import sleep from "./sleep.js"
import today from "./today.js"

/** 分组标记：锅巴软分组（SOFT_GROUP_BEGIN）以 label 作为页签标题 */
const groupStart = (label) => ({ component: "SOFT_GROUP_BEGIN", label })

/**
 * 构建锅巴表单 schema。
 * 必须在 supportGuoba() 被调用时执行（此时 Bot 已登录、Bot.gl 有数据），
 * 这样 Select 群号选项（options: allGroup()）才能获取到群列表；
 * 若在模块加载时构建，Bot.gl 为空会导致群号下拉没有选项。
 */
export function buildSchemas() {
  return [
    groupStart("缤纷樱落"),
    ...bfyl(),
    groupStart("每日塔罗"),
    ...tarot(),
    groupStart("放假提醒"),
    ...holiday(),
    groupStart("蜜柑RSS"),
    ...rss(),
    groupStart("精致睡眠"),
    ...sleep(),
    groupStart("今日番剧"),
    ...today(),
  ]
}

/** 数组字段（Input 逗号分隔）：配置文件为数组，锅巴表单中转为逗号分隔字符串 */
const arrayFields = {
  bfyl: ["masters"],
}
// 群号字段（holiday.groupList / sleep.groups / today.groupList）
// 已在锅巴中改为 Select 多选，值本身为数组，无需任何转换

/** JSON 文本字段：配置文件中为对象/数组，锅巴表单中转为 JSON 字符串 */
const jsonFields = {
  bfyl: ["advancedPool", "beginnerPool"],
  today: ["schedule"],
}

function arrayToStr(value) {
  if (Array.isArray(value)) return value.join(",")
  return value ?? ""
}

function strToArray(value, type = "string") {
  if (value == null) return []
  if (Array.isArray(value)) return value
  return String(value)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (type === "number" ? Number(s) : s))
}

export function getConfigData() {
  const bfylCfg = Config.getConfig("bfyl")
  const holidayCfg = Config.getConfig("holiday")
  const sleepCfg = Config.getConfig("sleep")
  const todayCfg = Config.getConfig("today")

  // Input 数组字段转逗号字符串（群号 Select 多选直接使用数组，无需转换）
  arrayFields.bfyl.forEach((f) => (bfylCfg[f] = arrayToStr(bfylCfg[f])))

  // JSON 字段转字符串
  jsonFields.bfyl.forEach((f) => (bfylCfg[f] = JSON.stringify(bfylCfg[f], null, 2)))
  jsonFields.today.forEach((f) => (todayCfg[f] = JSON.stringify(todayCfg[f], null, 2)))

  return {
    bfyl: bfylCfg,
    tarot: Config.getConfig("tarot"),
    holiday: holidayCfg,
    rss: Config.getConfig("rss"),
    sleep: sleepCfg,
    today: todayCfg,
  }
}

export function setConfigData(data, { Result }) {
  try {
    if (data.bfyl) {
      const { masters, advancedPool, beginnerPool, ...rest } = data.bfyl
      Config.setConfig("bfyl", {
        ...rest,
        masters: strToArray(masters, "number"),
        advancedPool: JSON.parse(advancedPool || "[]"),
        beginnerPool: JSON.parse(beginnerPool || "[]"),
      })
    }
    if (data.tarot) {
      Config.setConfig("tarot", data.tarot)
    }
    if (data.holiday) {
      const { groupList, ...rest } = data.holiday
      Config.setConfig("holiday", { ...rest, groupList: strToArray(groupList) })
    }
    if (data.rss) {
      Config.setConfig("rss", data.rss)
    }
    if (data.sleep) {
      const { groups, ...rest } = data.sleep
      Config.setConfig("sleep", { ...rest, groups: strToArray(groups, "number") })
    }
    if (data.today) {
      const { groupList, schedule, ...rest } = data.today
      Config.setConfig("today", {
        ...rest,
        groupList: strToArray(groupList),
        schedule: JSON.parse(schedule || "{}"),
      })
    }
    return Result.ok({}, "保存成功")
  } catch (err) {
    logger.error("[WMD-plugin] 锅巴保存配置失败:", err)
    return Result.fail("配置保存失败，请检查填写格式", "保存失败")
  }
}
