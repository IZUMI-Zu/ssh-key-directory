# SSH Key Directory

A config-as-code SSH public key directory for Cloudflare Workers. It provides GitHub-style `.keys` endpoints, identity groups, aliases, JSON metadata, fingerprints, and a responsive inspection UI without a database.

这是一个运行在 Cloudflare Workers 上的多人员 SSH 公钥目录。网页给人查看，纯文本与 JSON 接口给 cloud-init、provisioning 脚本和审计工具使用。

## 配置人员和公钥

所有公开数据都在 `keys/directory.config.ts` 中维护。一个人员包含规范名称、显示名称、可选别名和任意数量的公钥：

```ts
{
  handle: 'example',
  displayName: 'Example',
  aliases: ['demo'],
  keys: [
    {
      type: 'ed25519',
      publicKey: 'AAAAC3NzaC1lZDI1NTE5AAAA...',
      comment: 'laptop',
    },
  ],
}
```

新增一个人员只需在 `identities` 数组中增加一项。以下配置会同时提供 `/xx.keys`、`/x.keys` 和对应的 JSON/API 路由：

```ts
{
  handle: 'xx',
  displayName: 'XX',
  aliases: ['x'],
  keys: [
    {
      type: 'ecdsa-sk',
      publicKey: 'AAAAE2VjZHNh...',
      options: 'verify-required',
      comment: 'phone-key',
    },
  ],
}
```

`publicKey` 只填写 OpenSSH 公钥的 Base64 部分。不要提交私钥、私钥 stub、PIN、恢复码、`.key` 或 `.ppk` 文件。

### Groups

Groups 将多个人员的公钥合并为一个经过指纹去重的 `authorized_keys` 端点。组也支持别名，成员可以填写人员的规范名称或人员别名：

```ts
groups: [
  {
    handle: 'operators',
    displayName: 'Operators',
    aliases: ['ops'],
    members: ['example', 'xx'],
  },
]
```

以上配置会提供：

```text
GET /groups/operators.keys
GET /groups/ops.keys
GET /groups/operators.json
GET /api/v1/groups
GET /api/v1/groups/operators
GET /api/v1/groups/ops
```

组端点同样支持可选的 `?type=` 参数，例如 `/groups/operators.keys?type=ecdsa-sk`。同一把公钥即使出现在多个成员中，也只会在组输出中出现一次。

### Key type 缩写与别名

| 主缩写 | 类型别名 | 发布的 OpenSSH 类型 |
| --- | --- | --- |
| `ed25519` | `ed` | `ssh-ed25519` |
| `ed25519-sk` | `sk-ed25519`, `ed-sk` | `sk-ssh-ed25519@openssh.com` |
| `ecdsa-p256` | `ecdsa`, `p256` | `ecdsa-sha2-nistp256` |
| `ecdsa-p384` | `p384` | `ecdsa-sha2-nistp384` |
| `ecdsa-p521` | `p521` | `ecdsa-sha2-nistp521` |
| `ecdsa-sk` | `sk-ecdsa`, `p256-sk` | `sk-ecdsa-sha2-nistp256@openssh.com` |
| `pq` | `mldsa44`, `ml-dsa` | `ssh-mldsa44-ed25519@openssh.com` |
| `rsa` | `rsa-key` | `ssh-rsa` |

主缩写、类型别名和完整 OpenSSH 类型都可以用于配置文件及 `?type=` 查询。名称不区分大小写。`options` 支持 `cert-authority`、`restrict`、`verify-required`、`no-touch-required` 等 authorized_keys 选项。

Worker 会检查人员名称和别名冲突、算法、Base64 SSH 数据头、重复指纹和 8 KiB 行长度限制，并计算标准 `SHA256:` 指纹。

## 本地验证

```bash
pnpm install
pnpm run check
pnpm run dev
```

`pnpm run test` 会同时执行 Worker 路由测试和可自动化的 Antfu UI pre-flight 检查。响应式布局、深色模式和视觉层级仍需要浏览器验收。

常用接口：

```text
GET /example.keys
GET /demo.keys
GET /example.json
GET /api/v1/directory
GET /api/v1/identities/example
GET /api/v1/identities/demo
GET /groups/operators.keys
GET /groups/ops.json
GET /api/v1/groups
GET /api/v1/groups/ops
GET /fingerprints.json
GET /healthz
```

`/api/v1/directory` 返回全部人员及其公钥。规范名称与别名会解析到同一份目录。响应包含 CORS、ETag 与缓存重验证头。

通过 `type` 查询参数只获取一种公钥。身份别名和类型别名可以组合：

```text
GET /example.keys?type=ed25519
GET /demo.keys?type=ed
GET /example.json?type=ssh-ed25519
GET /api/v1/identities/demo?type=ed
GET /groups/operators.keys?type=ed
GET /api/v1/groups/ops?type=ssh-ed25519
```

类型名称无效时返回 `400`；类型有效但该人员没有对应公钥时返回 `404`。

## 部署

默认配置会部署到 Cloudflare 提供的 `workers.dev` 域名：

```bash
pnpm exec wrangler login
pnpm run deploy
```

需要 Custom Domain 时，复制模板为被 Git 忽略的本地配置，再修改域名：

```powershell
Copy-Item wrangler.custom.example.jsonc wrangler.local.jsonc
```

然后执行：

```bash
pnpm run deploy:custom
```

发布前可以用 `pnpm run deploy:custom:dry-run` 检查本地配置，而不真正上线。Custom Domain 必须位于当前 Cloudflare 账户的有效 zone 中，并且不能已有冲突记录。提交开源仓库时不要提交个人的 `wrangler.local.jsonc`。

服务器初始化示例：

```bash
install -d -m 700 -o ubuntu -g ubuntu /home/ubuntu/.ssh
curl -fsSL https://keys.example.com/example.keys \
  -o /home/ubuntu/.ssh/authorized_keys
chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
```

公钥目录适合在部署或受控同步时写入本地 `authorized_keys`。不要把远程 HTTP 服务放进每次 SSH 登录的实时认证链路。

网页使用 UnoCSS、Phosphor Icons、DM Sans 与 DM Mono 构建。字体文件随产物发布，不依赖运行时字体 CDN。

## 开源维护

项目使用 MIT License。安全问题请遵循 `SECURITY.md` 私下报告；贡献流程见 `CONTRIBUTING.md`。GitHub Actions 会执行 lint、Worker 路由测试、Antfu UI pre-flight、Wrangler 类型检查、生产构建和部署 dry run。
