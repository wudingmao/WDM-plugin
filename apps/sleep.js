import plugin from '../../lib/plugins/plugin.js'
import Config from '../components/Config.js'

export class sleep extends plugin {
	constructor() {
		super({
			/** 功能名称 */
			name: '精致睡眠',
			/** 功能描述 */
			dsc: '精致睡眠',
			event: 'message',
			/** 优先级，数字越小等级越高 */
			priority: 1,
			rule: [{
				/** 命令正则匹配 */
				reg: '^#*晚安$',
				/** 执行方法 */
				fnc: 'sleep'
			}]
		})

		// 从配置文件读取
		const cfg = Config.getConfig('sleep')
		this.groups = cfg.groups || [] // 启用群号
		this.muteEndHour = cfg.muteEndHour ?? 7 // 第二天早上7点解禁
		this.noMuteStart = cfg.noMuteStart ?? 6 // 不触发开始小时
		this.noMuteEnd = cfg.noMuteEnd ?? 21 // 不触发结束小时
	}

	async sleep(e) {
		const now = new Date();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const seconds = now.getSeconds();

		// 判断当前时间是否在 noMute 时间段内（默认 6 点到 21 点），不触发
		if (!this.groups.includes(e.group_id) || (hours >= this.noMuteStart && hours < this.noMuteEnd)) {
			return;
		}

		let muteDuration;
		if (hours >= this.noMuteEnd) {
			// 从晚上 noMuteEnd 点禁言到第二天早上
			muteDuration = ((this.muteEndHour + 24 - hours) * 60 - minutes) * 60 - seconds;
		} else {
			// 凌晨时段，从当前时间禁言到第二天早上
			muteDuration = ((this.muteEndHour - hours) * 60 - minutes) * 60 - seconds;
		}

		await e.group.muteMember(e.user_id, muteDuration); // 直接使用秒数
		e.reply(`晚安~我的朋友~明天早上${this.muteEndHour}点见`);
		return true;
	}
}
