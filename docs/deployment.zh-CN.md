# 部署教程

[返回中文 README](../README.zh-CN.md) | [English](./deployment.md)

SSH Key Directory 支持两种部署方式，它们都会发布同一个 Worker 和响应式网页。

| 方式 | 适用场景 | 构建时使用的目录配置 |
| --- | --- | --- |
| Deploy to Cloudflare | 快速创建 fork 并启用自动构建 | fork 中被追踪的 `keys/directory.config.example.ts` |
| 本地 Wrangler | 从自己的电脑控制个人部署 | 被 Git 忽略的 `keys/directory.config.ts` |

两个文件都只能放 SSH 公钥。不要添加私钥、安全密钥 stub、PIN、恢复码、`.key` 或 `.ppk` 文件。

## 准备条件

- Cloudflare 账户
- 本地部署需要 Node.js 22.6 或更高版本以及 pnpm 10 或更高版本
- 只有使用 Custom Domain 时才需要由 Cloudflare 管理的 DNS zone
- 使用 Deploy to Cloudflare 按钮时需要公开的 GitHub 或 GitLab 仓库

## 方式一：Deploy to Cloudflare

点击[中文 README](../README.zh-CN.md) 顶部的按钮，然后：

1. 登录 Cloudflare 并选择账户。
2. 设置仓库名称和 Worker 名称。
3. 等待 Cloudflare 克隆、构建并部署项目。
4. 在 Git 托管平台中打开新生成的仓库。
5. 修改 `keys/directory.config.example.ts` 中的身份、别名、身份组和公钥。
6. 提交并推送，Workers Builds 会发布更新后的目录。

首次部署会有意使用安全的示例目录。云端构建从干净 checkout 开始，因此 `pnpm run config:init` 会在构建前把被追踪的示例复制为被忽略的运行时配置。

不要把包含个人部署目录的变更提交回上游项目。

使用 Cloudflare 显示的 `workers.dev` 地址检查部署：

```bash
curl -fsSL https://<worker>.<account-subdomain>.workers.dev/healthz
curl -fsSL https://<worker>.<account-subdomain>.workers.dev/<handle>.keys
```

## 方式二：使用 Wrangler 部署

Fork 或克隆仓库，然后安装依赖并创建本地配置：

```bash
pnpm install
pnpm run config:init
```

编辑 `keys/directory.config.ts`。这个文件已被 Git 忽略，安装、开发、测试和构建命令都不会覆盖它。

检查并部署：

```bash
pnpm run check
pnpm exec wrangler login
pnpm run deploy:dry-run
pnpm run deploy
```

`pnpm run deploy` 会先构建 Worker 和静态资源，再执行 `wrangler deploy`。默认的 `wrangler.jsonc` 会启用 Cloudflare 提供的 `workers.dev` 域名。

随时可以用下面的命令确认当前登录账户：

```bash
pnpm exec wrangler whoami
```

## 添加 Custom Domain

任何部署完成后，最简单的方式是进入 Cloudflare Dashboard > Workers & Pages > 你的 Worker > Settings > Domains & Routes > Add > Custom Domain。

如果希望通过本地配置管理域名，先复制示例：

```bash
cp wrangler.custom.example.jsonc wrangler.local.jsonc
```

PowerShell：

```powershell
Copy-Item wrangler.custom.example.jsonc wrangler.local.jsonc
```

编辑 `wrangler.local.jsonc` 中的准确主机名：

```jsonc
{
  "routes": [
    {
      "pattern": "keys.example.com",
      "custom_domain": true
    }
  ]
}
```

不要填写 `https://`、路径或通配符。这个主机名必须属于当前 Cloudflare 账户中的有效 zone。检查并部署：

```bash
pnpm run deploy:custom:dry-run
pnpm run deploy:custom
```

Wrangler 会在部署时注册 Custom Domain。`wrangler.local.jsonc` 已被忽略，因此个人域名不会混入可复用的上游仓库。

使用 Git 自动构建时，可以在自己的 fork 中把相同的 `routes` 配置加入被追踪的 `wrangler.jsonc`，也可以直接在 Cloudflare 控制台添加域名。

## 部署后新增或轮换公钥

本地 Wrangler 部署：

1. 编辑 `keys/directory.config.ts`。
2. 运行 `pnpm run check`。
3. 运行 `pnpm run deploy` 或 `pnpm run deploy:custom`。
4. 检查规范名称和别名端点。

Deploy to Cloudflare 或 Workers Builds 部署：

1. 在部署 fork 中编辑 `keys/directory.config.example.ts`。
2. 提交并推送变更。
3. 等待 Cloudflare 构建完成。
4. 检查线上端点。

常用检查请求：

```bash
curl -fsSL https://keys.example.com/<handle>.keys
curl -fsSL https://keys.example.com/<alias>.json
curl -fsSL 'https://keys.example.com/<handle>.keys?type=ed'
curl -fsSL https://keys.example.com/fingerprints.json
curl -fsSL https://keys.example.com/healthz
```

请明确使用 `https://`。`curl keys.example.com/...` 可能只显示 Cloudflare 的 HTTP `301` 响应；`curl -fsSL` 中的 `-L` 会跟随跳转。

## 在服务器上安装公钥

先下载到临时文件，避免请求失败时替换仍然可用的 `authorized_keys`：

```bash
temp_keys="$(mktemp)"
trap 'rm -f "$temp_keys"' EXIT

curl -fsSL https://keys.example.com/groups/operators.keys -o "$temp_keys"
install -d -m 700 -o ubuntu -g ubuntu /home/ubuntu/.ssh
install -m 600 -o ubuntu -g ubuntu "$temp_keys" /home/ubuntu/.ssh/authorized_keys
```

请按服务器修改用户、用户组和端点。多人共享访问权限时更适合使用身份组端点。应在服务器初始化或受控同步任务中拉取，不要在每次 SSH 登录时实时请求远程服务。

## 常见问题

| 现象 | 检查内容 |
| --- | --- |
| 云端仍显示示例用户 | 在部署 fork 中修改并推送 `keys/directory.config.example.ts` |
| 本地修改示例后没有生效 | 编辑已经存在的 `keys/directory.config.ts`，初始化不会覆盖它 |
| `curl` 显示 `301 Moved Permanently` | 使用 `https://` 地址和 `curl -fsSL` |
| Custom Domain 部署失败 | 确认主机名位于有效 Cloudflare zone 中，且没有与其他 DNS 记录或 Worker 冲突 |
| 有效的 `?type=` 请求返回 `404` | 该身份或身份组没有这种类型的公钥 |
| 未知的 `?type=` 返回 `400` | 使用支持的缩写、别名或完整 OpenSSH 类型 |

使用以下命令查看实时日志或回滚错误部署：

```bash
pnpm exec wrangler tail
pnpm exec wrangler versions list
pnpm exec wrangler rollback
```
