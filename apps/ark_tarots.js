import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs'
import path from 'path'
import Config from '../components/Config.js'

// 使用全局变量存储用户记录
let userDailyRecords = new Map()

export class tarot extends plugin {
  constructor() {
    super({
      name: '每日塔罗牌',
      dsc: '每日随机塔罗牌占卜',
      event: 'message',
      priority: 1,
      rule: [{
        reg: '^#*方舟塔罗牌$',
        fnc: 'drawTarot'
      }]
    })

    // 从配置文件读取
    const cfg = Config.getConfig('tarot')
    this.cardCount = cfg.cardCount || 44
    this.imagePath = cfg.imagePath || 'resources/tarots'

    // 塔罗牌释义数据（0-21为正位，22-43为逆位）
    this.tarotMeanings = {
      // 正位 0-21
      0: {name: '愚者', position: '正位', meaning: '新的开始、冒险、天真、自发性',detail: '愚者代表着新的旅程、冒险精神和对未知的信任。它鼓励你跟随内心，勇敢尝试新事物。'},
      1: {name: '魔术师', position: '正位', meaning: '意志力、能力、技巧',detail: '魔术师象征着创造力、技能和将想法变为现实的能力。你拥有实现目标所需的一切资源。'},
      2: {name: '女祭司', position: '正位', meaning: '直觉、潜意识、内在智慧',detail: '女祭司代表着直觉、内在智慧和神秘知识。倾听你内心的声音，相信你的直觉引导。'},
      3: {name: '女皇', position: '正位', meaning: '丰饶、生产、自然',detail: '女皇象征着丰饶、创造力和母性关怀。这是一个收获和成长的时期，享受生活的美好。'},
      4: {name: '皇帝', position: '正位', meaning: '权威、结构、控制',detail: '皇帝代表着秩序、权威和稳定。通过自律和领导力，你能够建立坚实的基础。'},
      5: {name: '教皇', position: '正位', meaning: '信仰、传统、仪式',detail: '教皇象征着传统、信仰和精神指引。寻求智慧导师或遵循既定的道德准则。'},
      6: {name: '恋人', position: '正位', meaning: '爱情、结合、关系',detail: '恋人牌代表着重要的选择、真爱和灵魂的连接。在关系中保持真诚和承诺。'},
      7: {name: '战车', position: '正位', meaning: '意志、自律、胜利',detail: '战车象征着意志力的胜利和前进的动力。通过自律和决心克服障碍，朝着目标前进。'},
      8: {name: '力量', position: '正位', meaning: '勇气、耐心、控制',detail: '力量牌代表着内心的勇气和温柔的力量。用同情和理解来应对挑战，而非暴力。'},
      9: {name: '隐士', position: '正位', meaning: '内省、沉思、独处',detail: '隐士象征着内省、智慧和孤独寻求。暂时远离喧嚣，寻找内心的真理和指引。'},
      10: {name: '命运之轮', position: '正位', meaning: '命运、转折点、机遇',detail: '命运之轮代表着生命的循环和命运的转折。拥抱变化，相信宇宙的时机安排。'},
      11: {name: '正义', position: '正位', meaning: '公正、真理、因果',detail: '正义牌象征着公平、真理和因果报应。你的行动会产生相应的后果，保持诚实和正直。'},
      12: {name: '倒吊人', position: '正位', meaning: '牺牲、等待、新视角',detail: '倒吊人代表着自愿牺牲和新的视角。有时候暂停和等待能带来更深的理解和启示。'},
      13: {name: '死神', position: '正位', meaning: '结束、转变、新生',detail: '死神牌象征着必要的结束和深刻的转变。放下过去，为新生的开始腾出空间。'},
      14: {name: '节制', position: '正位', meaning: '平衡、调和、节制',detail: '节制代表着平衡、适应和调和。在对立面之间找到中间道路，保持耐心和适度。'},
      15: {name: '恶魔', position: '正位', meaning: '束缚、物质、欲望',detail: '恶魔牌象征着物质束缚和欲望的枷锁。审视那些限制你自由的信念和习惯。'},
      16: {name: '高塔', position: '正位', meaning: '突变、灾难、启示',detail: '塔牌代表着突然的突破和启示性的变化。虽然剧烈，但这种破坏是为了重建更真实的基础。'},
      17: {name: '星星', position: '正位', meaning: '希望、灵感、宁静',detail: '星星象征着希望、灵感和内心的宁静。在黑暗中保持信心，你的梦想正在成形。'},
      18: {name: '月亮', position: '正位', meaning: '幻觉、恐惧、潜意识',detail: '月亮牌代表着潜意识、幻觉和不确定性。面对内心的恐惧，辨别真实与想象。'},
      19: {name: '太阳', position: '正位', meaning: '成功、活力、快乐',detail: '太阳象征着成功、活力和纯粹的快乐。这是一个充满信心、乐观和成就的时期。'},
      20: {name: '审判', position: '正位', meaning: '重生、内在召唤、赦免',detail: '审判牌代表着觉醒、重生和回应内心的召唤。是时候评估过去，迎接新的开始。'},
      21: {name: '世界', position: '正位', meaning: '完成、整合、成就',detail: '世界牌象征着圆满达成、旅程的结束和成功的完成。这是一个收获成果和庆祝成就的时刻。'},

      // 逆位 22-43
      22: {name: '愚者（逆位）', position: '逆位', meaning: '鲁莽、冒险失败、幼稚、缺乏计划',detail: '逆位愚者暗示鲁莽的行动和缺乏远见。在开始新冒险前，请三思而后行，做好充分准备。'},
      23: {name: '魔术师（逆位）', position: '逆位', meaning: '欺骗、技能不足、资源浪费',detail: '逆位魔术师表示能力未被充分利用或误导他人。重新评估你的资源，诚实面对自己的能力。'},
      24: {name: '女祭司（逆位）', position: '逆位', meaning: '直觉失灵、秘密泄露、情绪化',detail: '逆位女祭司暗示直觉被忽视或情绪失控。倾听内心声音，但避免过度敏感或保守秘密。'},
      25: {name: '女皇（逆位）', position: '逆位', meaning: '过度放纵、创造力阻塞、依赖',detail: '逆位女皇表示创造力受阻或过度物质依赖。需要找到生活各方面的平衡，重新连接内在的创造力。'},
      26: {name: '皇帝（逆位）', position: '逆位', meaning: '专制、控制欲过强、缺乏权威',detail: '逆位皇帝暗示滥用权力或缺乏领导力。需要检视自己的控制欲，学习更灵活的统治方式。'},
      27: {name: '教皇（逆位）', position: '逆位', meaning: '传统束缚、信仰危机、形式主义',detail: '逆位教皇表示传统成为束缚或信仰受到挑战。是时候寻找个人化的精神道路，而非盲目跟随。'},
      28: {name: '恋人（逆位）', position: '逆位', meaning: '关系破裂、选择困难、价值观冲突',detail: '逆位恋人暗示关系困难或错误选择。重新评估你的价值观，在做出重要决定前慎重考虑。'},
      29: {name: '战车（逆位）', position: '逆位', meaning: '失控、方向错误、缺乏自律',detail: '逆位战车表示缺乏方向或意志力薄弱。需要重新集中精力，找到明确的目标和前进方向。'},
      30: {name: '力量（逆位）', position: '逆位', meaning: '软弱、失去耐心、力量滥用',detail: '逆位力量暗示内心软弱或滥用力量。培养真正的勇气，学会用温和的方式处理冲突。'},
      31: {name: '隐士（逆位）', position: '逆位', meaning: '孤独、过度保守、逃避现实',detail: '逆位隐士表示过度孤立或逃避现实。虽然需要内省，但也要保持与外界的基本连接。'},
      32: {name: '命运之轮（逆位）', position: '逆位', meaning: '厄运、错失良机、抗拒改变',detail: '逆位命运之轮暗示抗拒改变或时机不佳。接受生活的起伏，在逆境中寻找成长的机会。'},
      33: {name: '正义（逆位）', position: '逆位', meaning: '不公、偏见、责任逃避',detail: '逆位正义表示不公平或逃避责任。面对事实真相，为自己的选择承担相应后果。'},
      34: {name: '倒吊人（逆位）', position: '逆位', meaning: '无谓牺牲、固执、缺乏远见',detail: '逆位倒吊人暗示无意义的牺牲或抗拒必要的暂停。有时候放手比坚持更有智慧。'},
      35: {name: '死神（逆位）', position: '逆位', meaning: '抗拒改变、停滞不前、恐惧结束',detail: '逆位死神表示抗拒必要的结束和转变。沉湎于过去会阻碍新的开始。'},
      36: {name: '节制（逆位）', position: '逆位', meaning: '失衡、过度、缺乏耐心',detail: '逆位节制暗示生活失衡或极端行为。寻找中间道路，恢复生活的和谐与平衡。'},
      37: {name: '恶魔（逆位）', position: '逆位', meaning: '摆脱束缚、欲望控制、觉醒',detail: '逆位恶魔表示开始摆脱物质束缚或负面模式。这是觉醒的时刻，认识到真正的自由在于内心。'},
      38: {name: '高塔（逆位）', position: '逆位', meaning: '避免灾难、压抑爆发、渐进改变',detail: '逆位塔暗示避免突然的灾难或压抑必要的改变。变革可能以较温和的方式发生，但不可阻挡。'},
      39: {name: '星星（逆位）', position: '逆位', meaning: '希望渺茫、灵感枯竭、信心丧失',detail: '逆位星星表示希望暂时黯淡或灵感枯竭。保持信念，即使在黑暗中也要寻找那微弱的光芒。'},
      40: {name: '月亮（逆位）', position: '逆位', meaning: '恐惧消散、真相浮现、直觉恢复',detail: '逆位月亮暗示恐惧开始消散，真相逐渐浮现。直觉重新恢复，能够更清晰地看待事物。'},
      41: {name: '太阳（逆位）', position: '逆位', meaning: '短暂成功、活力不足、快乐短暂',detail: '逆位太阳表示成功可能短暂或活力不足。享受当下的快乐，但为未来的挑战做好准备。'},
      42: {name: '审判（逆位）', position: '逆位', meaning: '拒绝召唤、犹豫不决、无法重生',detail: '逆位审判暗示拒绝内心的召唤或害怕改变。是时候面对自我，接受重生的机会。'},
      43: {name: '世界（逆位）', position: '逆位', meaning: '未完成、延迟成功、需要整合',detail: '逆位世界表示目标尚未完全达成或成功延迟。需要最后的努力来整合所有元素，完成循环。'}
    }
  }

  async drawTarot(e) {
    try {
      const today = new Date().toDateString()
      const userId = e.user_id.toString()

      console.log(`用户 ${userId} 请求塔罗牌，当前记录数: ${userDailyRecords.size}`)

      // 检查用户今天是否已经抽过卡 - 使用全局变量
      if (userDailyRecords.has(userId)) {
        const record = userDailyRecords.get(userId)
        console.log(`找到用户记录:`, record)

        if (record.date === today) {
          // 用户今天已经抽过卡
          const { cardId, cardName, meaning, detail } = record
          const imagePath = path.join(process.cwd(), `${this.imagePath}/${cardId}.png`)

          let msgContent = [
            `你今天已经抽过塔罗牌了哦！\n`,
            `✨ 今日塔罗牌占卜结果 ✨\n`,
            `🃏 今日塔罗牌：${cardName}\n`,
            `📖牌义：${meaning}\n`,
            `${detail}\n`
          ]

          // 如果图片存在，在消息开头添加图片
          if (fs.existsSync(imagePath)) {
            const pic = segment.image(`file://${imagePath}`)
            msgContent.unshift(pic)
          } else {
            msgContent.push(`（图片文件丢失）`)
          }

          await e.reply(msgContent)
          return true
        } else {
          console.log(`用户记录过期，上次日期: ${record.date}，今天: ${today}`)
        }
      }

      // 生成基于用户ID和日期的随机数
      const seed = this.generateDailySeed(userId, today)
      const random = this.seededRandom(seed)
      const cardId = Math.floor(random * this.cardCount)

      const cardInfo = this.tarotMeanings[cardId]
      const imagePath = path.join(process.cwd(), `${this.imagePath}/${cardId}.png`)

      // 保存用户今日记录到全局变量
      userDailyRecords.set(userId, {
        date: today,
        cardId: cardId,
        cardName: cardInfo.name,
        meaning: cardInfo.meaning,
        detail: cardInfo.detail
      })

      console.log(`新增用户记录，当前记录数: ${userDailyRecords.size}`)

      // 清理过期记录
      this.cleanExpiredRecords()

      if (fs.existsSync(imagePath)) {
        const pic = segment.image(`file://${imagePath}`)
        const msg = [
          pic,
          `✨ 今日塔罗牌占卜结果 ✨\n`,
          `🃏 今日塔罗牌：${cardInfo.name}\n`,
          `📖牌义：${cardInfo.meaning}\n`,
          `${cardInfo.detail}\n`,
          `愿这张牌为你带来启示...`
        ]
        await e.reply(msg)
      } else {
        await e.reply([
          `✨ 今日塔罗牌占卜结果 ✨\n`,
          `🃏 今日塔罗牌：${cardInfo.name}\n`,
          `📖牌义：${cardInfo.meaning}\n`,
          `${cardInfo.detail}\n`,
          `（图片加载失败，但牌义依然有效）`
        ])
        console.log(`塔罗牌图片不存在: ${imagePath}`)
      }

      return true

    } catch (error) {
      console.error('塔罗牌功能出错:', error)
      await e.reply('塔罗牌占卜失败，请稍后再试~')
      return true
    }
  }

  /**
   * 生成每日种子值
   */
  generateDailySeed(userId, dateString) {
    const seedStr = `${userId}-${dateString}`
    let hash = 0
    for (let i = 0; i < seedStr.length; i++) {
      const char = seedStr.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  /**
   * 基于种子的随机数生成器
   */
  seededRandom(seed) {
    const x = Math.sin(seed++) * 10000
    return x - Math.floor(x)
  }

  /**
   * 清理过期记录（保留最近3天的记录）
   */
  cleanExpiredRecords() {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    const threeDaysAgoStr = threeDaysAgo.toDateString()

    let deletedCount = 0
    for (const [userId, record] of userDailyRecords.entries()) {
      if (new Date(record.date) < new Date(threeDaysAgoStr)) {
        userDailyRecords.delete(userId)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      console.log(`清理了 ${deletedCount} 条过期塔罗牌记录`)
    }
  }
}
