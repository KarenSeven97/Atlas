# Atlas

历史事件与市场影响研究网站。公开版无需访问密码，所有访客共享云端事件与笔记。

## 部署

仓库名 Atlas，GitHub Pages 网址：https://KarenSeven97.github.io/Atlas/
在仓库 Settings → Pages 中将 Source 设为 GitHub Actions。推送 main 后自动测试、构建并发布。

## 本地运行

Node.js 24，运行 npm ci 和 npm run dev。无需 API Key 的本地 Demo 可独立使用。
运行 npm run build:pages 构建公开云端版本；输出 dist。

## 公开版范围

事件、Markdown 笔记、标签、事件关系、同步时间轴、行情比较、CSV/JSON 导入导出保留。公开访客均可修改和删除共享内容，请定期备份。AI 调用和密钥管理不公开。行情为标注的合成 Demo 或自导入数据。

云端仅通过 atlas-public 读写 atlas_workspace，沿用 Trading 项目下的 Atlas 独立资料，不接触 Trading 交易数据。仓库只含代码与 Demo，不含访问密码、AI Key、本机凭据或个人资料导出。

旧站点的密码入口暂不用于此公开部署；私有后端代码保留，便于以后恢复访问控制。
