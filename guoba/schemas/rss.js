export default () => [
  {
    field: "rss.checkInterval",
    label: "RSS 检查频率（Cron）",
    component: "Input",
    placeholder: "如 */5 * * * *",
  },
  {
    field: "rss.configFile",
    label: "订阅数据文件（相对 Yunzai 根目录）",
    component: "Input",
    placeholder: "resources/RSS.json",
  },
]
