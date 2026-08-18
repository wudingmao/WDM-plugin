import Parser from 'rss-parser'
import { writeFileSync, readFileSync } from 'fs'
import path from 'path'
import plugin from '../../lib/plugins/plugin.js'
import schedule from 'node-schedule'
import Config from '../components/Config.js'

// 添加订阅命令正则（与 rule 保持一致）
const ADD_REG = '^#蜜柑添加([^]*)$'

// 常量定义（构造时从配置文件读取）
let CONFIG_FILE = path.join(process.cwd(), 'resources/RSS.json')
let CRON_SCHEDULE = '*/5 * * * *' // 每5分钟执行一次
let pluginInstance = null // 用于保存插件实例
let configData = {}

export class rss extends plugin {
  constructor() {
    super({
      name: 'mikanime定时推送',
      dsc: 'mikanime定时推送',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#mikanime$',
          fnc: 'activeCheckRSSUpdates',
        },
        {
          reg: '^#蜜柑添加([^]*)$',
          fnc: 'activeAddUser',
        },
      ],
    })

    // 从配置文件读取
    const cfg = Config.getConfig('rss')
    CRON_SCHEDULE = cfg.checkInterval || '*/5 * * * *'
    CONFIG_FILE = path.join(process.cwd(), cfg.configFile || 'resources/RSS.json')

    pluginInstance = this // 保存当前插件实例
    configData = loadConfig()
    autoTask()
  }

  async activeCheckRSSUpdates() {
    await checkRSSUpdates()
  }
  async activeAddUser(e) {
    await addUser(e)
  }

  get Bot() {
    return this.e?.bot ?? Bot
  }
}

// 加载配置文件
function loadConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) || {}
  } catch {
    return {}
  }
}

// 保存配置文件
function saveConfig() {
  writeFileSync(CONFIG_FILE, JSON.stringify(configData, null, 2))
}

// 添加用户（只接收e参数）
function addUser(e) {
  const qq = e.user_id
  const regRet = new RegExp(ADD_REG).exec(e.msg)
  const rssUrl = regRet[1]

  configData[qq] = {
    rssUrl,
    lastCheck: 0,
  }

  saveConfig()
}

// 获取所有用户
function getAllUsers() {
  return Object.entries(configData)
}

// 更新最后检查时间
function updateLastCheck(qq, timestamp = Date.now()) {
  if (configData[qq]) {
    configData[qq].lastCheck = timestamp
    saveConfig()
  }
}

async function checkRSSUpdates() {
  if (!pluginInstance) {
    console.error('插件实例未初始化')
    return
  }

  const bot = pluginInstance.Bot
  const rssParser = new Parser({
    customFields: { item: ['torrent', 'torrent.pubDate', 'torrent.link'] },
  })

  const getMagnetFromUrl = (url) => {
    const hashMatch = url.match(/([0-9a-f]{40})\.torrent$/i)
    return hashMatch ? `magnet:?xt=urn:btih:${hashMatch[1]}` : null
  }

  for (const [qq, config] of getAllUsers()) {
    const { rssUrl, lastCheck } = config
    const now = Date.now()

    try {
      console.log(`[QQ${qq}] 开始检查RSS更新...`)
      const feed = await rssParser.parseURL(rssUrl)

      // 直接检查所有在 lastCheck 之后发布的内容
      const updates = feed.items
        .filter((item) => {
          const pubDate = new Date(item.torrent?.pubDate).getTime()
          return pubDate > lastCheck
        })
        .map((item) => ({
          title: item.title,
          date: new Date(item.torrent?.pubDate).getTime(), // 改为存储时间戳
          dateISO: item.torrent?.pubDate,
          magnet: getMagnetFromUrl(item.enclosure?.url),
          size: (item.enclosure?.length / 1024 / 1024).toFixed(2) + ' MB',
          link: item.torrent?.link || item.link,
        }))

      if (updates.length > 0) {
        console.log(`[QQ${qq}] 发现 ${updates.length} 条新更新`)

        const sendResults = await Promise.all(
          updates.map(async (update) => {
            try {
              const message = [
                `【新番更新】${update.title}`,
                `发布时间: ${update.dateISO}`,
                `大小: ${update.size}`,
                `磁力: ${update.magnet}`,
                `链接: ${update.link}`,
              ].join('\n')

              await bot.pickFriend(qq).sendMsg(message)
              console.log(`[QQ${qq}] 已发送: ${update.title.substring(0, 20)}...`)
              return true
            } catch (err) {
              console.error(`[QQ${qq}] 发送失败: ${err.message}`)
              return false
            }
          })
        )

        const successCount = sendResults.filter(Boolean).length
        console.log(`[QQ${qq}] 发送完成: ${successCount}/${updates.length} 成功`)
        // 更新 lastCheck 为最新的一条更新的时间戳
        const latestUpdate = updates.reduce((latest, current) =>
          current.date > latest.date ? current : latest, updates[0])
        updateLastCheck(qq, latestUpdate.date)
      } else {
        console.log(`[QQ${qq}] 没有新内容`)
      }

    } catch (error) {
      console.error(`[QQ${qq}] RSS检查失败:`, error.message)
    }
  }
}

function autoTask() {
  logger.info('[蜜柑]：autoTask1...')
  schedule.scheduleJob(CRON_SCHEDULE, async () => {
    logger.info('[蜜柑]：autoTask2...')
    checkRSSUpdates()
  })
}
