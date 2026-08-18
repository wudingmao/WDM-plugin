import plugin from '../../lib/plugins/plugin.js'
import fs from 'fs/promises'
import fs_ from 'node:fs'
import path from 'path'
import Config from '../components/Config.js'

const _path = process.cwd()
const resPath = path.join(`${_path}/resources`, `pokemmo`)
const jsonPath = path.join(resPath, `pokemmo.json`)
const masterPath = path.join(resPath, `master.json`)

export class bfyl extends plugin {
    constructor() {
        super({
            name: '[WDM]缤纷樱落',
            dsc: '缤纷樱落抽卡~',
            event: 'message',
            priority: 10,
            rule: [
                {
                    reg: '^#(缤纷樱落)(增加|添加)yp([^]*)$',
                    fnc: 'addcount'
                },
                {
                    reg: '^#(缤纷樱落)(减少|减)yp([^]*)$',
                    fnc: 'subcount'
                },
                {
                    reg: '^#?(缤纷|樱落|缤纷樱落)(萌新|初级)池(单抽)?$',
                    fnc: 'takereg'
                },
                {
                    reg: '^#?(缤纷|樱落|缤纷樱落)高级池(单抽)?$',
                    fnc: 'takesen'
                },
                {
                    reg: '^#?(缤纷|樱落|缤纷樱落)(萌新|初级)池十连(抽)?$',
                    fnc: 'taketenreg'
                },
                {
                    reg: '^#?(缤纷|樱落|缤纷樱落)高级池十连(抽)?$',
                    fnc: 'taketensen'
                },
                {
                    reg: '^#?(缤纷|樱落|缤纷樱落)查看(yp|点数)$',
                    fnc: 'lookme'
                },
                {
                    reg: '^#?(缤纷|樱落|缤纷樱落)绑定([^]*)$',
                    fnc: 'myid'
                },
                {
                    reg: '^#?赋权(yp|YP)$',
                    fnc: 'addAuthorizedId'
                },
                {
                    reg: '^#?减权(yp|YP)$',
                    fnc: 'rmAuthorizedId'
                }
            ]
        })

        // 从配置文件读取奖品池与管理员列表
        const cfg = Config.getConfig('bfyl')
        this.bfmaster = cfg.masters || []
        this.prizePools = {
            advancedPool: cfg.advancedPool || [],
            beginnerPool: cfg.beginnerPool || []
        }
    }

    async init() {
        if (!fs_.existsSync(resPath)) {
            await fs.mkdir(resPath)
        }
        if (!fs_.existsSync(jsonPath)) {
            await fs.writeFile(jsonPath, JSON.stringify([]), 'utf8')
        }
        if (!fs_.existsSync(masterPath)) {
            await fs_.writeFileSync(masterPath, JSON.stringify({ authorizedIds: [] }, null, 2))
        }

        /*
        初始化文件
        */
    }

    // 加载人员信息
    loadPersonnel() {
        try {
            const data = fs_.readFileSync(jsonPath, 'utf8')
            return JSON.parse(data)
        } catch (err) {
            if (err.code === 'ENOENT') {
                // 文件不存在，返回一个空对象
                return {}
            } else {
                // 其他错误，重新抛出
                throw err
            }
        }
    }

    // 保存人员信息
    savePersonnel(personnel) {
        fs_.writeFileSync(jsonPath, JSON.stringify(personnel, null, 2))
    }

    // 读取master.json文件
    readMasterFile() {
        const data = fs_.readFileSync(masterPath, 'utf8')
        return JSON.parse(data)
    }

    // 写入master.json文件
    writeMasterFile(data) {
        fs_.writeFileSync(masterPath, JSON.stringify(data, null, 2))
    }

    // 添加新的有权限的人员ID
    async addAuthorizedId(e) {
        let myid = e.user_id
        if (this.bfmaster.includes(myid)) {
            let masterData = this.readMasterFile()
            if (!masterData.authorizedIds.includes(e.at)) {
                masterData.authorizedIds.push(e.at)
                this.writeMasterFile(masterData)
                this.e.reply(`已为${e.at}加好权限了！`)
            } else {
                this.e.reply(`${e.at}已经有权限了！`)
            }
        } else {
            this.e.reply([`你谁啊就赋权`, `${myid}`])
        }
    }

    async rmAuthorizedId(e) {
        let myid = e.user_id
        if (this.bfmaster.includes(myid)) {
            let masterData = this.readMasterFile()
            const index = masterData.authorizedIds.indexOf(e.at)
            if (index !== -1) {
                masterData.authorizedIds.splice(index, 1)
                this.writeMasterFile(masterData)
                this.e.reply(`已移除${e.at}的权限了！`)
            } else {
                this.e.reply(`${e.at}没有权限怎么减！`)
            }
        } else {
            this.e.reply(`你谁啊就赋权`)
        }
    }

    // 减少yp
    async subcount(e) {
        const masterData = this.readMasterFile()
        const authorizedIds = masterData.authorizedIds || []
        const combinedAuthorizedIds = [...this.bfmaster, ...authorizedIds] // 合并两个数组

        if (combinedAuthorizedIds.includes(e.user_id)) {
            // 从消息中提取yp，并转换为数字
            const points = parseInt(e.msg.replace(/^#(缤纷樱落)(减少|减)yp/, ''), 10)
            if (isNaN(points)) {
                console.log('yp格式不正确')
                return
            }

            // 加载当前人员信息
            let personnel = this.loadPersonnel()

            if (!personnel[e.at]) {
                this.e.reply(`QQ为${e.at}的训练家不存在`)
            } else {
                // 如果人员已存在，则修改yp
                let islow = personnel[e.at].yp - points

                if (islow < 0) {
                    this.e.reply(`该训练家只有${personnel[e.at].yp}点，再减要成负数了！`)
                } else {
                    personnel[e.at].yp -= points
                    this.e.reply([`已为QQ为${e.at}的宝可梦训练家减少yp：${points}`, `\n还有${personnel[e.at].yp}点yp`])
                }
            }
            // 保存修改后的人员信息
            this.savePersonnel(personnel)

            return true
        } else {
            this.e.reply([segment.at(e.user_id), `没有权限你减个🔨`])
            return false
        }
    }

    async addcount(e) {
        const masterData = this.readMasterFile()
        const authorizedIds = masterData.authorizedIds || []
        const combinedAuthorizedIds = [...this.bfmaster, ...authorizedIds] // 合并两个数组

        if (combinedAuthorizedIds.includes(e.user_id)) {
            // 从消息中提取yp，并转换为数字
            const points = parseInt(e.msg.replace(/^#(缤纷樱落)(增加|添加)yp/, ''), 10)
            if (isNaN(points)) {
                console.log('yp格式不正确')
                return
            }

            // 加载当前人员信息
            let personnel = this.loadPersonnel()

            if (!personnel[e.at]) {
                if (points > 0) {
                    // 如果人员不存在且是增加yp，则创建该人员
                    personnel[e.at] = { id: e.at, yp: points, 新年红包: 0, 护符金币: 0, '2V宝可梦': 0, '3V宝可梦': 0, '4V宝可梦': 0, '5V宝可梦': 0, '6V宝可梦': 0, 肩包: 0, 双色帽: 0, 心之鳞片: 0, 宝可梦素材: 0 }
                    this.e.reply(`已创建QQ为${e.at}的训练家，并初始化yp为：${points}`)
                } else {
                    // 如果人员不存在且是减少yp，则不做任何操作
                    this.e.reply(`error`)
                    return
                }
            } else {
                // 如果人员已存在，则修改yp
                personnel[e.at].yp += points
                this.e.reply([`已为QQ为${e.at}的宝可梦训练家增加yp：${points}`, `\n还有${personnel[e.at].yp}点yp`])
            }
            // 保存修改后的人员信息
            this.savePersonnel(personnel)

            return true
        } else {
            this.e.reply([segment.at(e.user_id), `没有权限你加个🔨`])
            return false
        }
    }

    // 萌新池抽奖
    async takereg(e) {
        let personnel = this.loadPersonnel()

        if (!personnel[e.user_id]) {
            // 人员不存在
            this.e.reply([segment.at(e.user_id), `还没有创建账号哦，#?(缤纷|樱落|缤纷樱落)查看yp创建账号`])
            return false
        } else {
            if (personnel[e.user_id].yp < 1) {
                this.e.reply([segment.at(e.user_id), `一点yp都没有，抽个🔨`])
                return false
            } else {
                personnel[e.user_id].yp -= 1 // 假设每次抽奖消耗1yp
                let getprize = this.getRandomPrize(this.prizePools.beginnerPool)

                // 根据抽到的奖品更新personnel对象
                if (!personnel[e.user_id][getprize.item]) {
                    // 如果该物品在personnel中不存在，则初始化为0
                    personnel[e.user_id][getprize.item] = 0
                }
                // 更新物品数量
                personnel[e.user_id][getprize.item] += getprize.quantity
                this.e.reply([segment.at(e.user_id), `抽到了${getprize.quantity}个${getprize.item}\n`, `还有${personnel[e.user_id].yp}点yp`])
                // 保存修改后的人员信息
                this.savePersonnel(personnel)
            }
        }
        return true
    }

    // 萌新池抽奖十连
    async taketenreg(e) {
        let personnel = this.loadPersonnel()

        if (!personnel[e.user_id]) {
            this.e.reply([segment.at(e.user_id), `还没有创建账号哦，#?(缤纷|樱落|缤纷樱落)查看yp创建账号`])
            return false
        } else {
            if (personnel[e.user_id].yp < 10) {
                this.e.reply([segment.at(e.user_id), `yp不足`])
                return false
            } else {
                personnel[e.user_id].yp -= 10 // 假设每次抽奖消耗1yp
                let msg = ''
                for (let i = 0; i < 10; i++) {
                    let getprize = this.getRandomPrize(this.prizePools.beginnerPool)
                    msg += `抽到了${getprize.quantity}个${getprize.item}\n`

                    // 根据抽到的奖品更新personnel对象
                    if (!personnel[e.user_id][getprize.item]) {
                        personnel[e.user_id][getprize.item] = 0
                    }
                    personnel[e.user_id][getprize.item] += getprize.quantity
                }

                this.e.reply([segment.at(e.user_id), `\n`, msg, `还有${personnel[e.user_id].yp}点yp`])

                // 保存修改后的人员信息
                this.savePersonnel(personnel)
            }
        }
        return true
    }

    // 高级池
    async takesen(e) {
        let personnel = this.loadPersonnel()

        if (!personnel[e.user_id]) {
            this.e.reply([segment.at(e.user_id), `还没有创建账号哦，#?(缤纷|樱落|缤纷樱落)查看yp创建账号`])
            return false
        } else {
            if (personnel[e.user_id].yp < 10 && personnel[e.user_id].yp >= 1) {
                this.e.reply([segment.at(e.user_id), `高级池需要10点yp哦，你只有${personnel[e.user_id].yp}，不如在萌新池试试运气呢`])
                return false
            } else if (personnel[e.user_id].yp < 1) {
                this.e.reply([segment.at(e.user_id), `一点yp都没有，抽个🔨`])
                return false
            } else {
                personnel[e.user_id].yp -= 10 // 假设每次抽奖消耗1yp
                let getprize = this.getRandomPrize(this.prizePools.advancedPool)

                // 根据抽到的奖品更新personnel对象
                if (!personnel[e.user_id][getprize.item]) {
                    personnel[e.user_id][getprize.item] = 0
                }
                personnel[e.user_id][getprize.item] += getprize.quantity
                this.e.reply([segment.at(e.user_id), `抽到了${getprize.quantity}个${getprize.item}\n`, `\n还有${personnel[e.user_id].yp}点yp`])
                // 保存修改后的人员信息
                this.savePersonnel(personnel)
            }
        }
        return true
    }

    // 高级池十连
    async taketensen(e) {
        let personnel = this.loadPersonnel()

        if (!personnel[e.user_id]) {
            this.e.reply([segment.at(e.user_id), `还没有创建账号哦，#?(缤纷|樱落|缤纷樱落)查看yp创建账号`])
            return false
        } else {
            if (personnel[e.user_id].yp < 100) {
                this.e.reply([segment.at(e.user_id), `yp不足`])
                return false
            } else {
                personnel[e.user_id].yp -= 100 // 假设每次抽奖消耗1yp
                let msg = ''
                for (let i = 0; i < 10; i++) {
                    let getprize = this.getRandomPrize(this.prizePools.advancedPool)
                    msg += `抽到了${getprize.quantity}个${getprize.item}\n`

                    if (!personnel[e.user_id][getprize.item]) {
                        personnel[e.user_id][getprize.item] = 0
                    }
                    personnel[e.user_id][getprize.item] += getprize.quantity
                }

                this.e.reply([segment.at(e.user_id), `\n`, msg, `还有${personnel[e.user_id].yp}点yp`])

                // 保存修改后的人员信息
                this.savePersonnel(personnel)
            }
        }
        return true
    }

    // 抽奖函数
    getRandomPrize(pool) {
        let totalProbability = 0
        pool.forEach(prize => {
            totalProbability += prize.probability
        })

        if (totalProbability !== 100) {
            throw new Error('概率总和必须为100%')
        }

        let randomNum = Math.random() * 100
        let currentProbability = 0

        for (let prize of pool) {
            currentProbability += prize.probability
            if (randomNum <= currentProbability) {
                return prize
            }
        }
    }

    async lookme(e) {
        // 加载当前人员信息
        let personnel = this.loadPersonnel()
        const masterData = this.readMasterFile()
        const authorizedIds = masterData.authorizedIds || []
        const combinedAuthorizedIds = [...this.bfmaster, ...authorizedIds] // 合并两个数组

        if (combinedAuthorizedIds.includes(e.user_id)) {
            if (e.at) {
                if (!personnel[e.at]) {
                    // 如果人员不存在，则创建该人员
                    personnel[e.at] = { id: e.at, yp: 0, 新年红包: 0, 护符金币: 0, '2V宝可梦': 0, '3V宝可梦': 0, '4V宝可梦': 0, '5V宝可梦': 0, '6V宝可梦': 0, 肩包: 0, 双色帽: 0, 心之鳞片: 0, 宝可梦素材: 0 }
                    this.e.reply(`已创建ID为${e.at}的训练家`)
                } else {
                    this.e.reply([segment.at(e.at), `该训练家有${personnel[e.at].yp}点yp`])
                }
                // 保存修改后的人员信息
                this.savePersonnel(personnel)
            } else {
                this.e.reply([segment.at(e.user_id), `你有${personnel[e.user_id].yp}点yp`])
            }
        } else {
            if (!personnel[e.user_id]) {
                // 如果人员不存在，则创建该人员
                personnel[e.user_id] = { id: e.user_id, yp: 0, 新年红包: 0, 护符金币: 0, '2V宝可梦': 0, '3V宝可梦': 0, '4V宝可梦': 0, '5V宝可梦': 0, '6V宝可梦': 0, 肩包: 0, 双色帽: 0, 心之鳞片: 0, 宝可梦素材: 0 }
                this.e.reply(`已创建ID为${e.user_id}的训练家`)
            } else {
                this.e.reply([segment.at(e.user_id), `你有${personnel[e.user_id].yp}点yp`])
            }
            // 保存修改后的人员信息
            this.savePersonnel(personnel)
            return true
        }
    }

    async myid(e) {
        // 从消息中提取id
        const ismyid = e.msg.replace(/^#?(缤纷|樱落|缤纷樱落)绑定/, '')

        // 加载当前人员信息
        let personnel = this.loadPersonnel()

        if (!personnel[e.user_id]) {
            this.e.reply([segment.at(e.user_id), `你还没有账号哦`])
        } else {
            // 如果人员已存在，则修改id
            personnel[e.user_id].id = ismyid
            this.e.reply([segment.at(e.user_id), `已修改id为${ismyid}`, `\n还有${personnel[e.user_id].yp}点yp`])
        }
        // 保存修改后的人员信息
        this.savePersonnel(personnel)
        return true
    }
}
