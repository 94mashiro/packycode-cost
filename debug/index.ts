/**
 * Debug工具统一入口
 *
 * 集中导出所有调试和测试功能，便于在开发面板中使用
 */

// API相关调试工具
export {
  testApiKeysPattern,
  validateApiKeysPattern
} from "./api/urlPatternTest"

export { testApiKeyDetection } from "./auth/apiKeyTest"

// 认证相关调试工具
export {
  runPermissionTests,
  testAllPermissions,
  testCookiePermissions,
  testNetworkPermissions
} from "./auth/permissionTest"

export {
  runApiConfigManagerTests,
  testAccountTypeSwitching,
  validateApiEnvironmentConfigs
} from "./auth/test"
