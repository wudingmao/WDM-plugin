export default () => [
  {
    field: "bfyl.masters",
    label: "管理员QQ",
    component: "Input",
    placeholder: "多个QQ用英文逗号分隔，如 495953969,2090013496",
  },
  { component: "Divider", label: "高级池（10yp 一抽）" },
  {
    field: "bfyl.advancedPool",
    label: "高级池奖品（JSON 数组）",
    component: "InputTextArea",
    rows: 12,
    placeholder: '[{"item":"新年红包","quantity":1,"probability":40}]',
  },
  { component: "Divider", label: "萌新池（1yp 一抽）" },
  {
    field: "bfyl.beginnerPool",
    label: "萌新池奖品（JSON 数组）",
    component: "InputTextArea",
    rows: 10,
    placeholder: '[{"item":"肩包","quantity":1,"probability":30}]',
  },
]
