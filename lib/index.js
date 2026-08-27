/**
 * dsh-theme-picker — DSH Standard 标准组件宿主入口。
 *
 * 主题切换是浏览器 UI + dsh-market API 职责，宿主侧无需逻辑；
 * 保持 FacetModule 空激活以符合 lifecycle.dsh/v1alpha1 契约。
 */
export default {
  activate() {
    // 无宿主行为：主题列表/开关由浏览器 SettingsSection facet 提供，
    // 操作通过 dsh-market HTTP API 完成。
  },
  deactivate() {
    // 无宿主资源需要释放。
  },
};
