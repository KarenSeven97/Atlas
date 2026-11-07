# Atlas

历史事件与市场影响研究网站。公开版无需访问密码，所有访客共享云端事件与笔记。

## 部署

仓库名 Atlas，GitHub Pages 网址：https://KarenSeven97.github.io/Atlas/
在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。推送 main 后自动测试、构建并发布。

## 本地运行

Node.js 24，运行 npm ci 和 npm run dev。无需 API Key 的本地 Demo 可独立使用。
运行 npm run build:pages 构建公开云端版本；输出 dist。

## 公开版范围

事件、Markdown 笔记、标签、事件关系、同步时间轴、行情比较、CSV/JSON 导入导出保留。公开访客均可修改和删除共享内容，请定期备份。AI 调用通过云端限流接口开放，密钥管理不公开。行情来自明确标注的 Alpaca IEX、用户导入或合成 Demo。

云端仅通过 atlas-public 读写 atlas_workspace，沿用 Trading 项目下的 Atlas 独立资料，不接触 Trading 交易数据。仓库只含代码与 Demo，不含访问密码、AI Key、本机凭据或个人资料导出。

旧站点的密码入口暂不用于此公开部署；私有后端代码保留，便于以后恢复访问控制。

## 安装 PWA 与云端配置

电脑 Chrome/Edge 地址栏安装图标或菜单安装；Android Chrome 菜单安装应用；iPhone/iPad Safari 分享→添加到主屏幕。网站顶部提供安装入口。PWA 缓存页面外壳，云端资料与保存仍需联网；不缓存 Supabase API 响应。

资料表为 Trading 项目的 public.atlas_workspace（data 为完整资料，revision 为版本）。顶部已同步云端表示保存成功。

AI 密钥配置入口：https://supabase.com/dashboard/project/kcwyrkewzjkydnyctnkc/functions/secrets 。添加 DEEPSEEK_API_KEY 和 GEMINI_API_KEY，值为各自提供商的 API Key。不要提交到 GitHub。云端已读取这些变量：优先 Gemini，失败回退 DeepSeek，并通过限流控制公开调用。

## 云端 AI 与 Alpaca

Supabase Secrets: GEMINI_API_KEY、DEEPSEEK_API_KEY；优先 Gemini（自动获取可用 Flash 文本模型，或通过 GEMINI_MODEL 指定），失败回退 DeepSeek（默认 deepseek-chat，可配置 DEEPSEEK_MODEL）。设置中可测试自动回退，事件笔记下方可分析；实际提供商和模型随结果记录。公开 AI 有每日及短期限流。

Alpaca 使用 Trading 已有 ALPACA_API_KEY、ALPACA_SECRET_KEY。在研究工作台选择 NVDA/AMD/TSM/QQQ 等美股/ETF 行情线，点击读取当前区间 Alpaca 日线。IEX 单一交易所、拆股复权、不含分红；从 2016 年起请求，缺失不填。SPX/NDX/SOX 现金指数及 A 股不由 Alpaca 提供；保持 Demo 或 CSV 导入，不能当作真实指数。下载的日线随工作区保存至 Supabase。Trading 现有 alpaca-market 函数不做修改。

