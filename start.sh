#!/usr/bin/env bash
set -euo pipefail
die() { printf '启动失败：%s\n' "$*" >&2; exit 1; }

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
project=$(pwd -P)
[[ $(uname -s) == Linux && -d /run/systemd/system ]] || die '请在使用 systemd 的 Ubuntu 或 Debian 服务器上运行。'
(( EUID == 0 )) || die '请使用 sudo bash start.sh。'
(( $# == 0 )) || die '用法：bash start.sh'
exec 9>/run/lock/image-outfit-start.lock
flock -n 9 || die '已有启动脚本在运行。'
runtime=/opt/image-outfit-runtime
install -d -m 755 "$runtime"

packages=()
for pkg in ca-certificates curl xz-utils python3 python3-venv libgomp1 libstdc++6; do
  if [[ $(dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null) != 'install ok installed' ]]; then packages+=("$pkg"); fi
done
if (( ${#packages[@]} )); then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "${packages[@]}"
fi

service_user=image-outfit
if ! id "$service_user" >/dev/null 2>&1; then
  useradd --system --user-group --no-create-home --shell /usr/sbin/nologin "$service_user"
fi
node_bin=''
for candidate in "$(command -v node || true)" "$runtime/node"; do
  if [[ -x $candidate ]] && runuser -u "$service_user" -- "$candidate" -e '
    const [major, minor] = process.versions.node.split(".").map(Number);
    if (major < 22 || (major === 22 && minor < 13)) process.exit(1);
    require("node:sqlite");
  ' >/dev/null 2>&1; then
    node_bin=$candidate
    break
  fi
done
if [[ -z $node_bin ]]; then
  version=v22.23.5
  case $(uname -m) in
    x86_64) arch=x64; digest=cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8 ;;
    aarch64) arch=arm64; digest=2babb9eb5264860d540849f4b064a6fbdebcdc323657d9d382ce23d313fd5e09 ;;
    *) die '请先安装带 node:sqlite 的 Node.js 22.13 或更高版本。' ;;
  esac
  name="node-$version-linux-$arch"
  temp=$(mktemp -d "$runtime/.install-XXXXXXXX")
  trap 'rm -rf -- "$temp"' EXIT
  downloaded=false
  for base in https://nodejs.org/dist https://npmmirror.com/mirrors/node; do
    printf '正在从 %s 安装 Node.js %s…\n' "$base" "$version"
    if curl -fLsS --connect-timeout 10 --speed-limit 1024 --speed-time 30 --max-time 600 \
      "$base/$version/$name.tar.xz" -o "$temp/node.tar.xz" &&
      printf '%s  %s\n' "$digest" "$temp/node.tar.xz" | sha256sum --check --status; then
      downloaded=true
      break
    fi
  done
  [[ $downloaded == true ]] || die 'Node.js 下载或校验失败。也可自行安装 Node.js 后重试。'
  tar -xJf "$temp/node.tar.xz" -C "$temp" "$name/bin/node"
  install -m 755 "$temp/$name/bin/node" "$runtime/node.new"
  mv -f "$runtime/node.new" "$runtime/node"
  node_bin="$runtime/node"
fi

/usr/bin/python3 -c 'import sys; sys.exit(sys.version_info < (3,10))' || die '抠图需要 Python 3.10 或更高版本。'
requirements=models/vision/requirements-cutout.txt
py_version=$(/usr/bin/python3 -c 'import sys; print("%s.%s" % sys.version_info[:2])')
read -r dep_hash _ < <(sha256sum "$requirements")
venv="$runtime/venvs/$py_version-${dep_hash:0:16}"
if [[ ! -f $venv/.ready ]] || ! "$venv/bin/python" -c 'import numpy, onnxruntime, PIL' 2>/dev/null; then
  printf '正在安装图片处理依赖…\n'
  /usr/bin/python3 -m venv "$venv"
  "$venv/bin/python" -m pip install --disable-pip-version-check --only-binary=:all: -r "$requirements"
  "$venv/bin/python" -c 'import numpy, onnxruntime, PIL'
  touch "$venv/.ready"
fi
printf '%s  %s\n' 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8 models/vision/u2netp.onnx | sha256sum --check --status || die '抠图模型缺失或损坏，请检查 Git 工作区。'

env_file=/etc/image-outfit.env
if [[ ! -f $env_file ]]; then
  env_file="$project/.env"
  [[ -e $env_file ]] || install -m 600 .env.example "$env_file"
fi
settings=$(env -u HOST -u PORT -u SQLITE_PATH "$node_bin" -e '
  const { loadEnv, config } = require("./server/config");
  loadEnv(process.argv[1]);
  const settings = config();
  console.log(settings.databaseFile);
  console.log(settings.port);
  console.log(settings.host);
' "$env_file")
mapfile -t values <<< "$settings"
db_file=${values[0]}
port=${values[1]}
host=${values[2]}
case "$host" in
  0.0.0.0) probe_host=127.0.0.1 ;;
  ::) probe_host='[::1]' ;;
  *:*) probe_host="[$host]" ;;
  *) probe_host=$host ;;
esac
unit=image-outfit.service
if ! systemctl is-active --quiet "$unit"; then
  "$node_bin" -e '
    const probe = require("node:net").createServer();
    probe.on("error", error => { console.error(error.message); process.exit(1) });
    probe.listen(Number(process.argv[1]), process.argv[2], () => probe.close());
  ' "$port" "$host" || die "请检查监听地址 $host 和端口 $port。"
fi
data_dir=$(dirname -- "$db_file")
if [[ ! -d $data_dir ]]; then
  install -d -m 700 -o "$service_user" -- "$data_dir"
elif [[ $data_dir == "$project/server/data" ]]; then
  chown "$service_user" -- "$data_dir"
fi
for file in "$db_file" "$db_file-wal" "$db_file-shm" "$db_file-journal"; do
  [[ -e $file ]] || continue
  if [[ $data_dir == "$project/server/data" ]]; then chown "$service_user" -- "$file"; fi
  runuser -u "$service_user" -- test -w "$file" || die "请授予 $service_user 写入 $file 的权限。"
done
runuser -u "$service_user" -- test -w "$data_dir" || die "请授予 $service_user 写入 $data_dir 的权限。"
runuser -u "$service_user" -- test -r "$project/server/index.js" || die "请授予 $service_user 读取项目目录的权限。"

cat > "/etc/systemd/system/$unit" <<UNIT
[Unit]
Description=Image Outfit API
After=network.target

[Service]
User=$service_user
WorkingDirectory=$project
StandardInput=file:$env_file
Environment="CUTOUT_PYTHON=$venv/bin/python"
Environment="PATH=$venv/bin:/usr/local/bin:/usr/bin:/bin"
Environment=PYTHONDONTWRITEBYTECODE=1
ExecStart="$node_bin" server/index.js --env-stdin
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=yes
PrivateTmp=yes

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable "$unit"
systemctl restart "$unit"
for (( attempt=0; attempt<30; attempt++ )); do
  sleep 1
  if systemctl is-active --quiet "$unit" &&
     curl --noproxy '*' -fsS --max-time 2 "http://$probe_host:$port/api/capabilities" 2>/dev/null |
       "$node_bin" -e 'try { const r = JSON.parse(require("fs").readFileSync(0)); process.exit(typeof r.ready === "boolean" ? 0 : 1) } catch { process.exit(1) }'; then
    printf '服务已启动，监听地址 %s，端口 %s\n配置文件：%s\nSQLite：%s\n' "$host" "$port" "$env_file" "$db_file"
    exit 0
  fi
done
journalctl -u "$unit" -n 20 --no-pager >&2
die '健康检查失败，请检查上面的日志和端口占用。'
