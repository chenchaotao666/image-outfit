#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
project_dir=$(pwd -P)
die() { printf '启动失败：%s\n' "$*" >&2; exit 1; }

[[ $(uname -s) == Linux ]] || die '请在 Linux 服务器上运行此脚本。'
(( EUID == 0 )) || die '请用 sudo bash start.sh 运行。'
export DOCKER_HOST=unix:///var/run/docker.sock
unset DOCKER_CONTEXT
exec 9>/run/lock/image-outfit-start.lock
flock -n 9 || die '已有启动脚本在运行。'

apt_updated=false
apt_update() {
  command -v apt-get >/dev/null || die '自动安装 Docker 需要 Ubuntu 或 Debian。'
  if [[ $apt_updated == false ]]; then
    apt-get update
    apt_updated=true
  fi
}

if ! command -v docker >/dev/null; then
  apt_update
  apt-get install -y docker.io
fi
if ! docker info >/dev/null 2>&1; then
  systemctl enable --now docker || die '无法启动 Docker，请查看 systemctl status docker。'
fi
if ! docker compose version >/dev/null 2>&1 && ! command -v docker-compose >/dev/null; then
  apt_update
  for package in docker-compose-plugin docker-compose-v2 docker-compose; do
    if apt-cache show "$package" >/dev/null 2>&1; then
      apt-get install -y "$package"
      break
    fi
  done
fi
if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
elif command -v docker-compose >/dev/null; then
  compose=(docker-compose)
else
  die '请安装 Docker Compose 后重新运行。'
fi

if [[ -f /etc/image-outfit.env ]]; then
  env_file=/etc/image-outfit.env
else
  env_file="$project_dir/.env"
  if [[ ! -e "$env_file" ]]; then
    install -m 600 .env.example "$env_file"
  fi
fi
export IMAGE_OUTFIT_ENV_FILE="$env_file"
# Read just the SQLite path as text. Environment files may contain secrets and are not shell scripts.
db_path=$(sed -nE 's/^[[:space:]]*SQLITE_PATH[[:space:]]*=[[:space:]]*(.*)$/\1/p' "$env_file" | head -n 1)
db_path=${db_path%$'\r'}
if [[ $db_path == \"*\" || $db_path == \'*\' ]]; then db_path=${db_path:1:-1}; fi
db_path=${db_path:-server/data/image-outfit.sqlite}
[[ $db_path == /* ]] || db_path="$project_dir/$db_path"
data_dir=$(realpath -m -- "$(dirname -- "$db_path")")
if [[ ! -d "$data_dir" ]]; then
  install -d -m 700 -o 10001 -g 10001 -- "$data_dir"
fi
export IMAGE_OUTFIT_DATA_DIR="$data_dir"
export IMAGE_OUTFIT_DB_NAME="$(basename -- "$db_path")"
export IMAGE_OUTFIT_RUN_AS="$(stat -c '%u:%g' -- "$data_dir")"
compose+=(--project-name image-outfit --env-file "$env_file" -f "$project_dir/compose.yaml")

printf '正在构建并启动服务。首次运行会下载运行环境和抠图模型。\n'
"${compose[@]}" up --build -d api
container=$("${compose[@]}" ps -q api)
if [[ -n $container ]]; then
  for ((attempt=0; attempt<30; attempt++)); do
    state=$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$container")
    case "$state" in
      'running healthy')
        "${compose[@]}" exec -T api node -e "
          const url = 'http://127.0.0.1:' + (process.env.PORT || 4173) + '/api/capabilities';
          fetch(url).then(async response => {
            if (!response.ok) throw Error('HTTP ' + response.status);
            const info = await response.json();
            console.log('服务已启动：' + url);
            console.log('AI 密钥配置：' + (info.ready ? '已填写' : '未配齐') + '；人脸检测模式：' + info.faceMode);
          }).catch(error => { console.error(error.message); process.exit(1); });
        "
        printf '配置文件：%s\nSQLite：%s/%s\n' "$env_file" "$data_dir" "$IMAGE_OUTFIT_DB_NAME"
        exit 0 ;;
      'running unhealthy'|exited*|dead*|restarting*) break ;;
    esac
    sleep 2
  done
fi
"${compose[@]}" logs --tail=30 api >&2
die '接口健康检查失败。请检查上面的日志、端口占用和数据库目录权限。'
