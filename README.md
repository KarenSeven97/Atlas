# Atlas

历史事件与金融市场研究，React + TypeScript + Vite。网站：https://karenseven97.github.io/Atlas/

## 访问与密码

网站需要密码，事件、笔记、AI、Alpaca 接口均由 Supabase 云端验证。会话令牌仅在当前页面内存中保存，刷新后需重新输入密码；不写入 localStorage、sessionStorage 或 URL。

密码存储位置：Trading Supabase → Table Editor → public.atlas_access → id=atlas。password_hash 为 PBKDF2-SHA256 哈希，salt 为随机盐，iterations=210000。不要直接向 password_hash 填明文。登录后到设置 → 云端访问修改密码；会话版本 auth_version 递增，旧会话失效。若忘记密码，由项目管理员生成新哈希更新；明文不存数据库和仓库。

## AI 与行情

只使用 DeepSeek，Supabase Edge Functions → Secrets 中配置 DEEPSEEK_API_KEY，可选 DEEPSEEK_MODEL（默认 deepseek-chat）。Atlas 不再读取 Gemini 密钥或调用其接口。

Alpaca 使用 ALPACA_API_KEY、ALPACA_SECRET_KEY。选择美股或 ETF 行情线，读取当前区间日线。IEX 单一交易所、拆股复权、不含分红；2016 年前缺失不填。A 股及现金指数不由此接口提供，需导入或明确标注 Demo。下载行情随工作区保存 Supabase atlas_workspace。

## 安装与运行

电脑 Chrome/Edge 使用顶部安装或地址栏安装图标；Android Chrome 菜单安装；iPhone/iPad Safari 分享→添加到主屏幕。PWA 缓存公共页面外壳，不缓存云端资料、登录接口和 AI 回复，云端需要联网。

npm ci；npm run dev 运行本地 Demo；npm test 测试；npm run build:pages 构建 GitHub Pages 版本，推送 main 自动发布。所有密钥与密码交付文件均不在仓库。
