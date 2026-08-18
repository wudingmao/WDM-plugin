import { allGroup } from "./helper.js"

export default () => [
  {
    field: "sleep.groups",
    label: "启用群号",
    bottomHelpMessage: "启用精致睡眠的群，可下拉选择或手动输入群号添加",
    component: "Select",
    componentProps: {
      allowAdd: true,
      allowDel: true,
      mode: "multiple",
      options: allGroup(),
    },
  },
  {
    field: "sleep.muteEndHour",
    label: "禁言结束时间（次日小时）",
    component: "InputNumber",
    min: 0,
    max: 24,
    defaultValue: 7,
  },
  {
    field: "sleep.noMuteStart",
    label: "不触发开始小时",
    component: "InputNumber",
    min: 0,
    max: 24,
    defaultValue: 6,
  },
  {
    field: "sleep.noMuteEnd",
    label: "不触发结束小时",
    component: "InputNumber",
    min: 0,
    max: 24,
    defaultValue: 21,
  },
]
