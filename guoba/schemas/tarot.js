export default () => [
  {
    field: "tarot.cardCount",
    label: "卡牌数量（正位+逆位）",
    component: "InputNumber",
    min: 1,
    max: 100,
    defaultValue: 44,
  },
  {
    field: "tarot.imagePath",
    label: "卡牌图片目录",
    component: "Input",
    placeholder: "resources/tarots",
  },
]
