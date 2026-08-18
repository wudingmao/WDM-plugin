import { allGroup } from "./helper.js"

export default () => [
  {
    field: "today.cronTime",
    label: "定时推送时间（Cron）",
    component: "Input",
    placeholder: "如 0 0 10 * * ?",
  },
  {
    field: "today.groupList",
    label: "推送群号",
    bottomHelpMessage: "今日番剧推送的群，可下拉选择或手动输入群号添加",
    component: "Select",
    componentProps: {
      allowAdd: true,
      allowDel: true,
      mode: "multiple",
      options: allGroup(),
    },
  },
  {
    field: "today.isAutoPush",
    label: "开启定时推送",
    component: "Switch",
    defaultValue: false,
  },
  { component: "Divider", label: "番剧表" },
  {
    field: "today.schedule",
    label: "番剧表（JSON，0=周日 ~ 6=周六）",
    component: "InputTextArea",
    rows: 12,
    placeholder: '{"0":["亚托莉 -我挚爱的时光-（00:30）"]}',
  },
]
