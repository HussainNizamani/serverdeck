const { runSsh } = require("./ssh");
const { runSsh2 } = require("./ssh2-client");

const TASKS = [
  "overview",
  "services",
  "serviceStatus",
  "serviceLogs",
  "serviceAction",
  "logs",
  "storage",
  "network",
  "processes",
  "updates",
  "containers",
  "users",
  "security",
  "command"
];

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function shell(script) {
  return `sh -lc ${shQuote(script)}`;
}

function serviceName(value) {
  const name = String(value || "").trim();
  if (!name) {
    const err = new Error("Service name is required");
    err.statusCode = 400;
    throw err;
  }
  return name;
}

function commandForTask(body = {}) {
  const task = String(body.task || "overview");

  if (!TASKS.includes(task)) {
    const err = new Error("Unknown server task");
    err.statusCode = 400;
    throw err;
  }

  if (task === "overview") {
    return shell(`
set +e
echo "== Metrics =="
if [ -r /etc/os-release ]; then . /etc/os-release; fi
printf "os=%s\\n" "\${PRETTY_NAME:-$(uname -s)}"
printf "load=%s\\n" "$(cut -d' ' -f1-3 /proc/loadavg 2>/dev/null)"
printf "mem_used_percent=%s\\n" "$(free 2>/dev/null | awk '/^Mem:/ { if ($2 > 0) printf "%.0f", $3 / $2 * 100 }')"
printf "disk_used_percent=%s\\n" "$(df -P / 2>/dev/null | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')"
printf "failed_services=%s\\n" "$(systemctl --failed --plain --no-legend 2>/dev/null | awk 'END { print NR }')"
echo
echo "== System =="
printf "Hostname: "; hostname 2>/dev/null || uname -n
printf "OS: "; if [ -r /etc/os-release ]; then . /etc/os-release; printf "%s\\n" "$PRETTY_NAME"; else uname -s; fi
printf "Kernel: "; uname -r
printf "Uptime: "; uptime -p 2>/dev/null || awk '{ printf "%d seconds\\n", $1 }' /proc/uptime 2>/dev/null
printf "CPUs: "; (nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo unknown)
printf "Load: "; cat /proc/loadavg 2>/dev/null || uptime
echo
echo "== Memory =="
free -h 2>/dev/null || awk '/MemTotal|MemAvailable|SwapTotal|SwapFree/ { print }' /proc/meminfo 2>/dev/null
echo
echo "== Disk =="
df -hP -x tmpfs -x devtmpfs 2>/dev/null | sed -n '1,12p'
echo
echo "== Failed Services =="
if command -v systemctl >/dev/null 2>&1; then systemctl --failed --no-pager --plain 2>/dev/null | sed -n '1,20p'; else echo "systemd unavailable"; fi
`);
  }

  if (task === "services") {
    return shell(`
set +e
if command -v systemctl >/dev/null 2>&1; then
  systemctl list-units --type=service --all --no-pager --plain 2>/dev/null | sed -n '1,180p'
else
  service --status-all 2>&1 | sed -n '1,180p'
fi
`);
  }

  if (task === "serviceStatus") {
    const name = serviceName(body.service);
    return shell(`systemctl status ${shQuote(name)} --no-pager -l 2>&1 || service ${shQuote(name)} status 2>&1`);
  }

  if (task === "serviceLogs") {
    const name = serviceName(body.service);
    return shell(`journalctl -u ${shQuote(name)} -n 180 --no-pager -o short-iso 2>&1 || echo "journalctl unavailable"`);
  }

  if (task === "serviceAction") {
    const allowed = new Set(["start", "stop", "restart", "reload", "enable", "disable"]);
    const action = String(body.action || "").trim();
    const name = serviceName(body.service);
    if (!allowed.has(action)) {
      const err = new Error("Unsupported service action");
      err.statusCode = 400;
      throw err;
    }
    return shell(`systemctl ${action} ${shQuote(name)} 2>&1 && systemctl status ${shQuote(name)} --no-pager -l 2>&1`);
  }

  if (task === "logs") {
    return shell(`
set +e
if command -v journalctl >/dev/null 2>&1; then
  journalctl -n 220 --no-pager -o short-iso 2>&1
elif [ -r /var/log/syslog ]; then
  tail -n 220 /var/log/syslog
elif [ -r /var/log/messages ]; then
  tail -n 220 /var/log/messages
else
  echo "No journalctl, syslog, or messages log available."
fi
`);
  }

  if (task === "storage") {
    return shell(`
set +e
echo "== Filesystems =="
df -hP -x tmpfs -x devtmpfs 2>/dev/null
echo
echo "== Block Devices =="
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL 2>/dev/null || echo "lsblk unavailable"
echo
echo "== Inodes =="
df -ihP -x tmpfs -x devtmpfs 2>/dev/null
`);
  }

  if (task === "network") {
    return shell(`
set +e
echo "== Addresses =="
ip -brief address 2>/dev/null || ifconfig -a 2>/dev/null
echo
echo "== Routes =="
ip route 2>/dev/null || route -n 2>/dev/null
echo
echo "== Listening Ports =="
ss -tulpn 2>/dev/null | sed -n '1,120p' || netstat -tulpn 2>/dev/null | sed -n '1,120p'
`);
  }

  if (task === "processes") {
    return shell(`ps -eo pid,ppid,user,stat,%cpu,%mem,etime,comm,args --sort=-%cpu 2>/dev/null | sed -n '1,90p'`);
  }

  if (task === "updates") {
    return shell(`
set +e
if command -v apt >/dev/null 2>&1; then
  apt list --upgradable 2>/dev/null | sed -n '1,120p'
elif command -v dnf >/dev/null 2>&1; then
  dnf check-update -q 2>&1 | sed -n '1,120p'; true
elif command -v yum >/dev/null 2>&1; then
  yum check-update -q 2>&1 | sed -n '1,120p'; true
elif command -v apk >/dev/null 2>&1; then
  apk version -l '<' 2>&1 | sed -n '1,120p'
else
  echo "No supported package manager detected."
fi
`);
  }

  if (task === "containers") {
    return shell(`
set +e
if command -v podman >/dev/null 2>&1; then
  podman ps -a 2>&1
elif command -v docker >/dev/null 2>&1; then
  docker ps -a 2>&1
else
  echo "No podman or docker command detected."
fi
`);
  }

  if (task === "users") {
    return shell(`
set +e
echo "== Login Users =="
getent passwd 2>/dev/null | awk -F: '$3 >= 1000 && $1 != "nobody" { printf "%-24s uid=%-8s home=%s shell=%s\\n", $1, $3, $6, $7 }' | sed -n '1,120p'
echo
echo "== Current Sessions =="
who 2>/dev/null || true
echo
echo "== Recent Logins =="
last -n 12 2>/dev/null || true
`);
  }

  if (task === "security") {
    return shell(`
set +e
echo "== Firewall =="
(systemctl is-active firewalld 2>/dev/null && firewall-cmd --state 2>/dev/null) || true
ufw status 2>/dev/null || true
echo
echo "== SELinux =="
getenforce 2>/dev/null || sestatus 2>/dev/null || echo "SELinux tools unavailable"
echo
echo "== SSHD =="
systemctl status sshd ssh --no-pager -l 2>/dev/null | sed -n '1,80p' || true
echo
echo "== Fail2ban =="
fail2ban-client status 2>/dev/null || echo "fail2ban unavailable"
`);
  }

  const command = String(body.command || "").trim();
  if (!command) {
    const err = new Error("Command is required");
    err.statusCode = 400;
    throw err;
  }
  return shell(command);
}

async function runServerTask(server, body = {}) {
  const task = String(body.task || "overview");
  const command = commandForTask(body);
  const timeoutMs = task === "command" ? 90000 : 45000;
  // Password-authenticated servers go through the ssh2 library; the openssh
  // binary (BatchMode) cannot accept a password non-interactively.
  const result = server.password
    ? await runSsh2(server, command, { timeoutMs })
    : await runSsh(server, command, { timeoutMs, batch: true });
  return {
    task,
    ...result
  };
}

module.exports = {
  TASKS,
  commandForTask,
  runServerTask,
  shQuote
};
