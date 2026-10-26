/**
 * dsh-theme-picker — 宿主半。
 *
 * 主题管理全部发生在浏览器侧：原生主题走客户端的 theme 服务，
 * 已装主题插件走 dsh-market 的同源 HTTP 路由。宿主侧不需要任何行为，
 * 保持一个空的 apply 即可（bundle 行仍需一个可挂载的入口）。
 */
export function apply() {}
