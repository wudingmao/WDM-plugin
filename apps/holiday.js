import plugin from '../../lib/plugins/plugin.js'
import common from '../../lib/common/common.js'
import schedule from 'node-schedule'
import Config from '../components/Config.js'

const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

// 缓存配置：按年份存储
let holidaysCache = {} // { year: { data, timestamp } }

export class example extends plugin {
    constructor() {
        super({
            name: '何时周末',
            dsc: '何时周末',
            event: 'message',
            priority: 5000,
            rule: [
                {
                    reg: '^#我要放假$',
                    fnc: 'holiday'
                }
            ]
        })

        // 从配置文件读取
        const cfg = Config.getConfig('holiday')
        this.time = cfg.cronTime || '0 30 9 * * ?'
        this.groupList = cfg.groupList || []
        this.appKey = cfg.appKey || ''
        this.cacheDuration = cfg.cacheDuration || 12 * 60 * 60 * 1000

        autoTask(this)
    }

    /**
     * 手动触发推送
     */
    async holiday(e) {
        logger.info('[用户命令]', e.msg)
        await pushHolidayInfo(e, 0)
    }
}

/**
 * 推送假期信息
 * @param {Object} target 发送目标（群或事件e）
 * @param {number} isAuto 是否自动推送（1为自动，0为手动）
 */
async function pushHolidayInfo(target, isAuto = 0) {
    try {
        const message = await getHolidayMessage()

        if (isAuto) {
            await target.sendMsg(message)
        } else {
            await target.reply(message)
        }
    } catch (error) {
        logger.error('[放假] pushHolidayInfo error:', error)
        if (!isAuto) {
            target.reply('获取假期信息失败，请稍后重试')
        }
    }
}

/**
 * 获取假期信息消息（支持跨年自动切换）
 */
async function getHolidayMessage() {
    try {
        const currentYear = new Date().getFullYear()
        // 先获取当年数据
        let holidays = await fetchHolidaysWithCache(currentYear)
        let result = calculateHolidays(holidays)

        // 如果当年假期已结束，尝试获取下一年数据
        if (result.status === "假期已结束") {
            try {
                const nextYear = currentYear + 1
                const nextYearHolidays = await fetchHolidaysWithCache(nextYear)
                // 检查下一年数据是否有效（至少有一个假期开始年份为 nextYear）
                const hasNextYearHoliday = nextYearHolidays.some(h => h.begin.startsWith(nextYear.toString()))
                if (hasNextYearHoliday) {
                    holidays = nextYearHolidays
                    result = calculateHolidays(holidays)
                }
                // 否则仍使用当年数据（result 保持 "假期已结束"）
            } catch (error) {
                logger.error('[放假] 获取下一年数据失败，继续使用当年数据:', error)
                // 使用当年数据，result 保持 "假期已结束"
            }
        }

        const today = new Date()
        const todayWeekdayIndex = today.getDay()
        const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`

        // 简单的表情映射
        const weekEmoji = ['😴', '📅', '📅', '📅', '📅', '📅', '🎉']
        // 判断今天是否为调休上班日
        const isWorkdayOnWeekendDay = (todayWeekdayIndex === 0 || todayWeekdayIndex === 6)
            ? isWorkdayOnWeekend(today, holidays)
            : false

        // 选择最终表情：调休上班日一律使用📅，否则使用默认映射
        const finalEmoji = isWorkdayOnWeekendDay ? '📅' : weekEmoji[todayWeekdayIndex]

        let message = `${finalEmoji} ${dateStr} ${days[todayWeekdayIndex]}\n`

        if (result.status === "假期进行中") {
            // 计算假期剩余天数
            const endDate = parseAPIDate(result.rawEnd)
            const remainingDays = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
            message += `🎊当前假期：${result.holiday}\n`
            message += `假期剩余天数：很恐怖，兄弟\n`
            message += `📌${result.remark}`

        } else if (result.status === "假期未开始") {
            // 计算距离周末的天数
            const daysUntilWeekend = daysUntilNextWeekend(holidays)
            const isWeekend = (todayWeekdayIndex === 0 || todayWeekdayIndex === 6)
            const isWorkdayOnWeekendDay = isWeekend ? isWorkdayOnWeekend(today, holidays) : false

            // 判断明天是否是假期
            const tomorrow = new Date(today)
            tomorrow.setDate(today.getDate() + 1)
            const isTomorrowHoliday = checkIfDateIsHoliday(tomorrow, holidays)
            // 判断明天是否是调休上班日
            const isTomorrowWorkdayOnWeekend = (tomorrow.getDay() === 0 || tomorrow.getDay() === 6)
                ? isWorkdayOnWeekend(tomorrow, holidays)
                : false

            // 合并下一行：假期名称和天数（使用空格分隔）
            message += `下个假期：${result.holiday} 还有：${result.daysUntil}天\n`

            // 如果今天是调休上班日，只显示调休提示，不显示任何周末信息
            if (isWorkdayOnWeekendDay) {
                message += `⚠️ 今天是调休上班日\n`
            }
            // 如果不是今天调休，才显示周末相关提示
            else {
                // 优先判断明天是否是假期
                if (isTomorrowHoliday) {
                    message += `明天就是假期啦！🌟\n`
                }
                // 其次判断明天是否是调休上班日
                else if (isTomorrowWorkdayOnWeekend) {
                    message += `⚠️ 明天是调休上班日\n`
                }
                // 再判断周末情况
                else if (daysUntilWeekend === 0) {
                    message += `今天就是周末！🏖️\n`
                } else if (daysUntilWeekend === 1) {
                    message += `明天就是周末啦！🌟\n`
                } else if (daysUntilWeekend < 5) {
                    message += `距离周末还有 ${daysUntilWeekend} 天\n`
                }
            }

            message += `📌${result.remark}`

        } else {
            message += `📌${result.remark}`
        }

        return message
    } catch (error) {
        logger.error('[放假] getHolidayMessage error:', error)
        return '获取假期信息失败，请稍后重试'
    }
}

/**
 * 检查某天是否是假期
 */
function checkIfDateIsHoliday(date, holidays) {
    const dateStr = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0')

    for (const holiday of holidays) {
        const startDate = parseAPIDate(holiday.begin)
        const endDate = parseAPIDate(holiday.end)
        const checkDate = new Date(date)
        checkDate.setHours(0, 0, 0, 0)

        if (checkDate >= startDate && checkDate <= endDate) {
            return true
        }
    }
    return false
}

/**
 * 获取指定年份的假期数据（带缓存）
 * @param {number} year 年份
 */
async function fetchHolidaysWithCache(year) {
    const now = Date.now()
    const cacheEntry = holidaysCache[year]
    const cacheDuration = Config.getConfig('holiday').cacheDuration || 12 * 60 * 60 * 1000

    if (cacheEntry && now - cacheEntry.timestamp < cacheDuration) {
        logger.info(`[放假] 使用缓存数据 (${year}年)`)
        return cacheEntry.data
    }

    logger.info(`[放假] 请求API获取新数据 (${year}年)`)
    try {
        const data = await fetchHolidays(year)
        holidaysCache[year] = {
            data: data,
            timestamp: now
        }
        return data
    } catch (error) {
        logger.error(`[放假] API请求失败 (${year}年):`, error)
        if (cacheEntry) {
            logger.info(`[放假] API失败，使用过期缓存 (${year}年)`)
            return cacheEntry.data
        }
        throw error
    }
}

/**
 * 调用API获取假期数据（POST请求）
 * @param {number} year 年份
 */
async function fetchHolidays(year) {
    const appKey = Config.getConfig('holiday').appKey || ''
    const url = `https://route.showapi.com/894-4?appKey=${appKey}`

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `year=${year}`
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        if (result.showapi_res_code !== 0) {
            throw new Error(`API error: ${result.showapi_res_error}`)
        }

        return result.showapi_res_body.data
    } catch (error) {
        logger.error('[放假] fetchHolidays error:', error)
        throw error
    }
}

// 将API返回的日期格式（YYYYMMDD）转换为JavaScript的Date对象
function parseAPIDate(dateStr) {
    const year = dateStr.slice(0, 4)
    const month = dateStr.slice(4, 6) - 1
    const day = dateStr.slice(6, 8)
    return new Date(year, month, day)
}

/**
 * 判断某天是否是调休上班日
 */
function isWorkdayOnWeekend(date, holidays) {
    const dateStr = date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0')

    for (const holiday of holidays) {
        if (holiday.inverse_days && holiday.inverse_days.includes(dateStr)) {
            return true
        }
    }
    return false
}

/**
 * 计算距离下一个周末的天数（考虑调休）
 */
function daysUntilNextWeekend(holidays) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i <= 7; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(today.getDate() + i)
        const weekday = checkDate.getDay()

        if ((weekday === 0 || weekday === 6) && !isWorkdayOnWeekend(checkDate, holidays)) {
            return i
        }
    }
    return 7
}

// 计算距离假期和假期剩余天数
function calculateHolidays(holidays) {
    const msPerDay = 1000 * 60 * 60 * 24
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let nextHoliday = null
    let currentHoliday = null

    for (const holiday of holidays) {
        const startDate = parseAPIDate(holiday.begin)
        const endDate = parseAPIDate(holiday.end)
        const endDatePlus1 = new Date(endDate)
        endDatePlus1.setDate(endDate.getDate() + 1)

        if (today < startDate) {
            if (!nextHoliday || startDate < parseAPIDate(nextHoliday.begin)) {
                nextHoliday = holiday
            }
        } else if (today < endDatePlus1) {
            currentHoliday = holiday
            break
        }
    }

    if (currentHoliday) {
        return {
            status: "假期进行中",
            holiday: currentHoliday.holiday,
            remark: currentHoliday.holiday_remark,
            rawEnd: currentHoliday.end // 用于计算剩余天数
        }
    } else if (nextHoliday) {
        const startDate = parseAPIDate(nextHoliday.begin)
        const daysUntil = Math.ceil((startDate - today) / msPerDay)
        return {
            status: "假期未开始",
            holiday: nextHoliday.holiday,
            daysUntil: daysUntil,
            remark: nextHoliday.holiday_remark
        }
    } else {
        return {
            status: "假期已结束",
            remark: "今年假期已结束，期待明年吧！"
        }
    }
}

/**
 * 定时任务
 */
function autoTask(ctx) {
    logger.info('[放假] 定时任务已启动')
    schedule.scheduleJob(ctx.time, async () => {
        logger.info('[放假] 执行定时推送')
        try {
            const currentYear = new Date().getFullYear()
            // 预刷新当年数据，确保推送时最新
            await fetchHolidaysWithCache(currentYear)

            // 预刷新下一年数据（如果当前月份 >= 10，提前获取下一年缓存）
            const currentMonth = new Date().getMonth() + 1 // 月份从0开始
            if (currentMonth >= 10) {
                const nextYear = currentYear + 1
                fetchHolidaysWithCache(nextYear).catch(err => {
                    logger.info('[放假] 预刷新下一年数据失败，可能尚未发布')
                })
            }

            for (let i = 0; i < ctx.groupList.length; i++) {
                let group = Bot.pickGroup(ctx.groupList[i])
                await pushHolidayInfo(group, 1)
                await common.sleep(1000)
            }
        } catch (error) {
            logger.error('[放假] 定时任务执行失败:', error)
        }
    })
}
