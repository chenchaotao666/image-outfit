# 启动后端服务

## 服务器启动与更新

在使用 systemd 的 Ubuntu 22.04+ 或 Debian 12+ 服务器上，以 root 身份运行：

```bash
cd /opt/image-outfit && git pull --ff-only && bash start.sh
```

首次启动会复用或安装 Node.js，为图片处理安装 Python 依赖，并设置开机自启。抠图模型随 Git 代码一起下载。看到“服务已启动”表示 API 健康检查已通过。以后更新代码时运行同一条命令，已就绪的运行环境会复用。

脚本优先读取 `/etc/image-outfit.env`，其次读取项目根目录的 `.env`。首次缺少配置时会从 `.env.example` 创建 `.env`。SQLite 默认保存在 `server/data/image-outfit.sqlite`。API 默认监听 `127.0.0.1:4173`，供反向代理转发；真机上线需配置 HTTPS、生产模式和微信登录凭据。

查看状态和日志：

```bash
systemctl status image-outfit --no-pager
journalctl -u image-outfit -n 50 --no-pager
```

## 本地开发

安装 Node.js 22.13 或更高版本，在项目根目录运行 `npm start`。默认 API 地址为 `http://127.0.0.1:4173/api`。
