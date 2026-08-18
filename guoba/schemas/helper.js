/**
 * 获取所有群，供锅巴 Select 群号选项使用
 * 返回 [{ label: '群名 (群号)', value: '群号' }]
 * Bot 未就绪时返回空数组（锅巴 Select 可手动输入群号添加）
 * 注意：必须在 supportGuoba() 被调用时执行（此时 Bot 已登录），
 * 若在模块加载时调用，Bot.gl 可能为空导致取不到群。
 */
export const allGroup = () => {
  const gl = globalThis.Bot?.gl
  if (!gl) return []
  const list = []
  gl.forEach((v, k) => {
    list.push({ label: `${v.group_name}(${k})`, value: String(k) })
  })
  return list
}
