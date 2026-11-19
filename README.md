# 启动后端服务

在 Ubuntu 或 Debian 服务器的项目根目录运行：

```bash
sudo bash start.sh
```

首次运行会安装所需的 Docker 和 Compose，构建图片处理环境并启动后台服务。更新代码或配置后，再次执行同一条命令。看到“服务已启动”即表示本机 API 已通过检查。

脚本优先读取 `/etc/image-outfit.env`，其次读取项目根目录的 `.env`。首次无配置时会从 `.env.example` 创建本机开发配置。SQLite 默认保存在宿主机的 `server/data/image-outfit.sqlite`。真机连接需配置 HTTPS 反向代理、生产模式及微信登录凭据。

本地开发可安装 Node.js 22.13.0 或更高版本，在项目根目录运行：

```sh
npm start
```

默认 API 地址为 `http://127.0.0.1:4173/api`。
