# Atlas 云端

## 边界

复用 Supabase Trading 项目 `kcwyrkewzjkydnyctnkc`，只使用 `atlas_` 前缀的表、RPC 与 `atlas-gateway` 函数。不读取或修改 `trading_shared_ledger`、`alpaca-market`。Atlas 与 Trading 的网站、访问密码、资料和 AI 连接独立。

```
浏览器 → Sites Worker /api/* → Supabase atlas-gateway
                              ├─ atlas_workspace / atlas_access / atlas_sessions
                              └─ atlas_connections → DeepSeek / Gemini
```

当前资料以带版本号的完整 V2 JSON 存储。事件、新闻、关系、资产、导入行情、笔记与分析保留稳定 ID，为后续合并迁移保留边界；尚未拆成独立实体表。一个工作区对应一个共享密码，所有持有密码的使用者共享同一套 Atlas 资料。

## 启动与构建

- `npm run dev`：原有本地 Demo + 本机 AI 服务，不访问云端资料，不需密码或 API Key。
- `npm run build`：本地模式静态构建。
- `npm run build:cloud`：启用云端验证并生成 `dist/server/index.js`，公共静态资源嵌入 Worker。只有云端构建适用于线上站点。
- `npm test`、`npm run test:cloud`：原有测试与云端会话、权限、密码轮换、冲突、密钥加密测试。

`site-worker.mjs` 中 Supabase 项目地址为公开路由标识，不含数据库管理密钥。云函数通过 Supabase 默认服务端环境访问数据库；管理密钥、访问密码、AI Key 不写入 Vite 环境变量。服务端 ESM 文件与生产入口位于本目录。

## 数据库与部署

`schema.sql` 只供首次初始化一个尚未创建 Atlas 表的项目，不是可重复执行脚本。不要将旧 `backend/schema.sql` 应用到共享 Trading 项目。先检查现有表，记录迁移，再部署本目录的 `index.ts`、`gateway.mjs`、`security.mjs`、`providers.mjs`，函数名 `atlas-gateway`。

函数关闭平台 JWT 检查，是因为本函数自行校验密码与数据库会话。所有资料、AI 和密码接口均要求有效会话；不是开放访问接口。所有 Atlas 表启用 RLS，撤销 anon/authenticated/PUBLIC 权限，无开放策略。函数 RPC 同样仅 service_role 可执行。

安全 Advisor 的 [RLS Enabled No Policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) INFO 提示对应上述服务端专用表：无客户端策略是本版本的刻意配置；anon/authenticated 也没有表权限。不是缺少待补的公开策略。

`atlas_access.allowed_origin` 必须为站点的完整 HTTPS Origin。更换站点域名后，只修改 Atlas 这一行。Worker 保持同源代理，不向浏览器发放 Supabase 管理密钥。

## 密码与 AI

- 初始密码交付文件在项目目录外，不进入 Git、部署包或研究备份。
- 打开网站输入密码；设置 → 云端访问可修改密码。PBKDF2-SHA256（210000 次、随机盐）；数据库只保存哈希。修改密码会撤销所有会话。
- 会话为随机令牌，浏览器只通过 Secure/HttpOnly/SameSite=None/Partitioned cookie 发送，数据库只存令牌 SHA-256；有效期 7 天。登录与 AI 请求有数据库支持的限流。
- 设置 → AI 连接：填写 DeepSeek 或 Gemini 的名称、模型 ID、API Key。密钥通过 HTTPS 发往云函数，加密落库；前端只能读取配置状态，不能读回密钥。真实模型响应的质量、额度和模型名称取决于提供商。
- AES-GCM 加密根默认来自云函数服务端凭据，可通过 Supabase Edge Secrets 的 `ATLAS_ENCRYPTION_KEY` 设置独立根。**已有 AI 连接后更换加密根或轮换服务端根，需要先规划重加密，或重新录入各 API Key。**此变量不属于前端构建环境。
- 忘记密码由 Supabase 项目管理员生成新的随机盐与 PBKDF2 哈希后调用 `atlas_change_password`，递增 auth_version 并撤销全部会话；不要往数据库存明文密码。

## 旧资料、草稿与冲突

新部署域名无法直接读取 localhost 的 IndexedDB。先在原本地网站 设置 → 数据备份 导出完整 JSON，再到云端 设置 → 资产与行情 → 导入完整 JSON。导入前下载当前云端资料备份；不会自动上传旧浏览器资料。首次空云库使用标注清楚的 Demo 种子。

云端写入采用 revision 比较更新。另一窗口已保存时返回 409，并停止当前窗口继续覆盖。请导出当前完整备份，重新载入最新云端版本，再手工合并或导入；不是自动逐字段合并。失败写入会保留 IndexedDB 的 `cloud:draft`，可在数据备份中导出未同步草稿；与旧本地 `current` 数据分开。浏览器草稿不替代定期 JSON 备份。

当前单次完整工作区请求上限约 16 MB；大规模日线库后续需拆成逐资产/分区表，不能将此快照接口当作无限容量的行情仓库。密码修改使用 auth_version 的原子比较更新，旧会话立即失效；过期会话行由清理过程回收。

## 后续接口

AI 云端代理已实现；行情、宏观、新闻实时 API 尚未接入。当前行情仍为标注的合成 Demo 或用户 CSV。后续可分别增加适配器与服务端凭据，无需改变事件 ID。多用户账户、权限分级和逐实体合并不在当前共享密码版本内。

## 内嵌浏览器登录兼容

登录 cookie 使用新名称 `__Host-atlas_session_v2`，配置 `SameSite=None; Secure; HttpOnly; Partitioned; Path=/`。分区存储使内嵌浏览器可保存本网站会话；独立浏览器窗口与内嵌窗口分别登录。新名称避免旧版未分区 cookie 遮蔽新会话。登录成功后再调用 /session 确认 cookie 已回传，确认前不挂载工作台；不支持保存时显示新窗口入口。Origin 检查和服务端会话校验保持开启。参考 [Chrome CHIPS 文档](https://privacysandbox.google.com/cookies/chips)。
