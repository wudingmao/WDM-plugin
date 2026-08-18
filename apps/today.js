import plugin from '../../lib/plugins/plugin.js'
import schedule from 'node-schedule'
import Config from '../components/Config.js'

// 创建一个数组来映射数字到星期的名称
const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export class example extends plugin {
  constructor() {
    super({
      name: '今日番剧',
      dsc: '今日番剧',
      event: 'message',
      priority: 5000,
      rule: [
        {
          reg: '^#今日番剧$',
          fnc: 'news',
        },
      ],
    })

    // 从配置文件读取
    const cfg = Config.getConfig('today')
    this.cronTime = cfg.cronTime || '0 0 10 * * ?' // 定时推送时间
    this.groupList = cfg.groupList || [] // 定时推送群号
    this.isAutoPush = cfg.isAutoPush ?? false // 是否开启定时推送
    this.scheduleList = cfg.schedule || {} // 番剧表

    autoTask(this)
  }

  async news(e) {
    printScheduleForWeekday(e, this.scheduleList)
  }
}

/**
 * 推送日历
 * @param e oicq传递的事件参数e
 */
// 函数，根据星期几输出对应的节目列表
function printScheduleForWeekday(e, scheduleObj, isAuto = 0) {
  var today = new Date();

  // 使用getDay()方法获取星期几，getDay()返回的是0-6的数字
  var todayWeekdayIndex = today.getDay();
  if (e.msg) {
    logger.info('[用户命令]', e.msg);
  }
  // 尝试从对象中检索节目列表，如果找不到则返回空数组
  const shows = scheduleObj[todayWeekdayIndex] || [];

  // 输出节目列表
  var msg = `今天是${days[todayWeekdayIndex]}，更新的番剧有：\n`;
  shows.forEach((show) => {
    msg += show + '\n';
  });
  msg = msg.replace(/\n$/, ''); // 移除最后的换行符

  if (isAuto) {
    e.sendMsg(msg);
  } else {
    e.reply(msg + '\n' + today);
  }
}

/**
 * 定时任务
 */
function autoTask(ctx) {
  if (ctx.isAutoPush) {
    schedule.scheduleJob(ctx.cronTime, () => {
      logger.info('[番剧]：开始自动推送...');
      for (let i = 0; i < ctx.groupList.length; i++) {
        let group = Bot.pickGroup(ctx.groupList[i]);
        printScheduleForWeekday(group, ctx.scheduleList, 1);
      }
    });
  }
}
