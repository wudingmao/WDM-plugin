import { allGroup } from "./helper.js"

export default () => [
  {
    field: "holiday.cronTime",
    label: "定时推送时间（Cron）",
    component: "Input",
    placeholder: "如 0 30 9 * * ?",
  },
  {
    field: "holiday.groupList",
    label: "推送群号",
    bottomHelpMessage: "放假提醒推送的群，可下拉选择或手动输入群号添加",
    component: "Select",
    componentProps: {
      allowAdd: true,
      allowDel: true,
      mode: "multiple",
      options: allGroup(),
    },
  },
  {
    field: "holiday.appKey",
    label: "放假接口 API Key",
    component: "Input",
    placeholder: "showapi 894-4 接口密钥",
  },
  {
    field: "holiday.cacheDuration",
    label: "数据缓存时长（毫秒）",
    component: "InputNumber",
    min: 0,
    defaultValue: 43200000,
  },
]
