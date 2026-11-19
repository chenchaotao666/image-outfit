# 启动后端服务

## 服务器启动与更新

将项目克隆到 Ubuntu 或 Debian 服务器的 `/opt/image-outfit` 后，以 `root` 身份执行下面的命令。如果使用普通账号，请将最后的 `bash start.sh` 改为 `sudo bash start.sh`。

```bash
cd /opt/image-outfit && git pull --ff-only && bash start.sh
```

- **首次启动**时，脚本会安装所需的 Docker 和 Compose，构建图片处理环境并启动后台服务。
- **后续更新**时，先在开发电脑上将改动提交并推送到 GitHub 的 `main` 分支，再在服务器执行上面同一条命令。代码拉取成功后，脚本会重新构建镜像并启动服务，沿用已有配置和 SQLite 数据。看到“服务已启动”表示 API 已通过健康检查。
- 如果改动涉及小程序前端，还需通过微信开发者工具上传新版，按微信发布流程审核上线。

脚本优先读取 `/etc/image-outfit.env`，其次读取项目根目录的 `.env`。首次无配置时会从 `.env.example` 创建本机开发配置。SQLite 默认保存在宿主机的 `server/data/image-outfit.sqlite`。真机连接需配置 HTTPS 反向代理、生产模式及微信登录凭据。

## 本地开发

安装 Node.js 22.13.0 或更高版本，在项目根目录运行以下命令。

```sh
npm start
```

默认 API 地址为 `http://127.0.0.1:4173/api`。
