#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
project_dir=$(pwd -P)
die() { printf '启动失败：%s\n' "$*" >&2; exit 1; }

local_image=''
build_locally=false
if [[ $# == 1 && $1 == --build ]]; then
  build_locally=true
elif (( $# > 0 )); then
  [[ $# == 2 && $1 == --image && -n ${2:-} && $2 != -* ]] || die '用法：bash start.sh [--build | --image 本机镜像标签]'
  local_image=$2
fi

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

if [[ -z $local_image && $build_locally == false ]]; then
  revision=$(git rev-parse --verify HEAD) || die '请从 Git 仓库运行，或使用 bash start.sh --build。'
  arch=$(docker version --format '{{.Server.Arch}}')
  [[ $arch == amd64 || $arch == arm64 ]] || die "当前架构 $arch 需要使用 bash start.sh --build。"
  local_image="image-outfit-api:$revision-$arch"
  image_revision() { docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$local_image" 2>/dev/null; }
  if [[ $(image_revision) != "$revision" ]]; then
    if ! command -v curl >/dev/null; then apt_update; apt-get install -y curl ca-certificates; fi
    release_url="https://github.com/chenchaotao666/image-outfit/releases/download/server-$revision-$arch"
    download_dir=$(mktemp -d)
    trap 'rm -f -- "$download_dir/api.tar.gz" "$download_dir/checksum"; rmdir -- "$download_dir"' EXIT
    printf '正在从 GitHub 获取当前提交的 Linux/%s 镜像…\n' "$arch"
    for ((attempt=1; attempt<=60; attempt++)); do
      status=$(curl --silent --show-error --location --connect-timeout 12 --max-time 45 --retry 2 \
        --output "$download_dir/checksum" --write-out '%{http_code}' "$release_url/api.tar.gz.sha256?t=$(date +%s)") ||
        die '服务器无法连接 GitHub Releases，请检查服务器访问 GitHub 的 HTTPS 网络。'
      [[ $status == 200 ]] && break
      [[ $status == 404 ]] || die "GitHub Releases 返回 HTTP $status。"
      if (( attempt == 1 )); then printf '镜像尚未发布，正在等待 GitHub Actions 完成构建…\n'; fi
      if (( attempt == 60 )); then die "该版本的镜像尚未就绪，请查看 https://github.com/chenchaotao666/image-outfit/actions"; fi
      sleep 10
    done
    read -r checksum _ < "$download_dir/checksum"
    [[ $checksum =~ ^[[:xdigit:]]{64}$ ]] || die '发布包校验文件格式不正确。'
    curl --fail --show-error --location --connect-timeout 12 --speed-time 90 --speed-limit 1024 --retry 2 \
      --output "$download_dir/api.tar.gz" "$release_url/api.tar.gz" || die '从 GitHub 下载服务器镜像失败。'
    printf '%s  %s\n' "$checksum" "$download_dir/api.tar.gz" | sha256sum --check --status || die '镜像校验失败。'
    docker load -i "$download_dir/api.tar.gz"
    [[ $(image_revision) == "$revision" ]] || die '导入的镜像与当前代码版本不符。'
  fi
fi

if [[ -n $local_image ]]; then
  platform=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$local_image") || die '请先用 docker load -i 导入离线镜像包。'
  host_platform=$(docker version --format '{{.Server.Os}}/{{.Server.Arch}}')
  [[ $platform == "$host_platform" ]] || die "镜像适用 $platform，当前服务器是 $host_platform。"
  export IMAGE_OUTFIT_IMAGE="$local_image"
  printf '使用已导入的本机镜像 %s。\n' "$local_image"
else
  export IMAGE_OUTFIT_IMAGE=image-outfit-api:local
  build_log=$(mktemp)
  trap 'rm -f -- "$build_log"' EXIT
  printf '正在构建服务镜像。首次运行会下载运行环境和抠图模型。\n'
  if ! "${compose[@]}" build api 2>&1 | tee "$build_log"; then
    if ! grep -Eiq '(failed to (resolve source metadata|load metadata)|registry-1\.docker\.io|auth\.docker\.io|error pulling image configuration|toomanyrequests:)' "$build_log"; then
      die '镜像构建失败，请检查上面的具体错误。'
    fi
    printf 'Docker Hub 拉取失败，改用 Google 提供的 Docker Hub 缓存重试。\n'
    "${compose[@]}" build --build-arg BASE_IMAGE_PREFIX=mirror.gcr.io/library/ api ||
      die '备用构建也失败。若服务器无法访问镜像源，请按 README 使用离线镜像。'
  fi
fi
up_args=(--no-build -d)
if [[ -n $local_image ]] && [[ $("${compose[@]}" up --help) == *--pull* ]]; then
  up_args+=(--pull never)
fi
"${compose[@]}" up "${up_args[@]}" api
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
