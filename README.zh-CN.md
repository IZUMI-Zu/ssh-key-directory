# SSH Key Directory

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/IZUMI-Zu/ssh-key-directory/actions/workflows/ci.yml/badge.svg)](https://github.com/IZUMI-Zu/ssh-key-directory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-3f7446.svg)](./LICENSE)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca.svg?logo=react&logoColor=white)](https://react.dev/)
[![UnoCSS 66](https://img.shields.io/badge/UnoCSS-66-333333.svg?logo=unocss&logoColor=white)](https://unocss.dev/)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IZUMI-Zu/ssh-key-directory)

一个以配置即代码方式管理的 Cloudflare Workers SSH 公钥目录。它无需数据库，即可提供类似 GitHub 的 `.keys` 端点、身份组、别名、JSON 元数据、指纹以及响应式查看界面。

## 目录

- [配置身份与公钥](#配置身份与公钥)
- [身份组](#身份组)
- [公钥类型别名](#公钥类型别名)
- [本地开发](#本地开发)
- [部署](#部署)
- [开源维护](#开源维护)

## 配置身份与公钥

所有公开目录数据都在 `keys/directory.config.ts` 中维护。一个身份包含规范名称、显示名称、可选别名和任意数量的公钥：

```ts
{
  handle: 'example',
  displayName: 'Example User',
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

新增一个人时，只需向 `identities` 数组追加一项。以下配置会同时提供 `/teammate.keys`、`/tm.keys` 以及对应的 JSON 和 API 路由：

```ts
{
  handle: 'teammate',
  displayName: 'Teammate',
  aliases: ['tm'],
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

## 身份组

身份组会把多个人员的公钥合并为一个按指纹去重的 `authorized_keys` 端点。组可以配置别名，成员既可以使用身份的规范名称，也可以使用身份别名：

```ts
groups: [
  {
    handle: 'operators',
    displayName: 'Operators',
    aliases: ['ops'],
    members: ['example', 'teammate'],
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

组端点同样支持可选的 `?type=` 查询参数，例如 `/groups/operators.keys?type=ecdsa-sk`。同一把公钥即使属于多个成员，也只会在组响应中出现一次。

## 公钥类型别名

| 规范缩写 | 可用别名 | 输出的 OpenSSH 类型 |
| --- | --- | --- |
| `ed25519` | `ed` | `ssh-ed25519` |
| `ed25519-sk` | `sk-ed25519`, `ed-sk` | `sk-ssh-ed25519@openssh.com` |
| `ecdsa-p256` | `ecdsa`, `p256` | `ecdsa-sha2-nistp256` |
| `ecdsa-p384` | `p384` | `ecdsa-sha2-nistp384` |
| `ecdsa-p521` | `p521` | `ecdsa-sha2-nistp521` |
| `ecdsa-sk` | `sk-ecdsa`, `p256-sk` | `sk-ecdsa-sha2-nistp256@openssh.com` |
| `pq` | `mldsa44`, `ml-dsa` | `ssh-mldsa44-ed25519@openssh.com` |
| `rsa` | `rsa-key` | `ssh-rsa` |

规范缩写、类型别名和完整 OpenSSH 类型都可以用于配置文件与 `?type=` 查询，名称不区分大小写。`options` 字段支持 `cert-authority`、`restrict`、`verify-required`、`no-touch-required` 等 `authorized_keys` 选项。

Worker 会检查身份名称和别名冲突、算法、Base64 SSH 数据头、重复指纹以及 8 KiB 行长度限制，并计算标准的 `SHA256:` 指纹。

## 本地开发

```bash
pnpm install
pnpm run check
pnpm run dev
```

`pnpm run test` 会执行 Worker 路由测试和自动化 Antfu UI 预检。响应式布局、深色模式和视觉层级仍应在浏览器中验收。

常用端点：

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

`/api/v1/directory` 返回所有身份及其公钥。规范名称与别名会解析到同一个目录条目。响应包含 CORS、ETag 和缓存重新验证响应头。

通过 `type` 查询参数可以只获取一种公钥。身份别名和类型别名可以组合使用：

```text
GET /example.keys?type=ed25519
GET /demo.keys?type=ed
GET /example.json?type=ssh-ed25519
GET /api/v1/identities/demo?type=ed
GET /groups/operators.keys?type=ed
GET /api/v1/groups/ops?type=ssh-ed25519
```

未知的公钥类型会返回 `400`；类型有效但目标身份没有对应公钥时会返回 `404`。

## 部署

顶部的 **Deploy to Cloudflare** 按钮会把这个公开仓库导入你的 GitHub 账户、配置 Workers Builds 并部署 Worker。如果更喜欢使用本地 Wrangler 工作流，可以执行下面的命令。

默认配置会部署到 Cloudflare 提供的 `workers.dev` 域名：

```bash
pnpm exec wrangler login
pnpm run deploy
```

需要 Custom Domain 时，将示例复制为已被 Git 忽略的本地配置，然后修改域名：

```powershell
Copy-Item wrangler.custom.example.jsonc wrangler.local.jsonc
```

然后执行：

```bash
pnpm run deploy:custom
```

发布前可运行 `pnpm run deploy:custom:dry-run` 检查本地配置而不真正上线。Custom Domain 必须位于当前 Cloudflare 账户的有效 zone 中，并且不能与已有记录冲突。发布 fork 时不要提交个人的 `wrangler.local.jsonc`。

服务器初始化示例：

```bash
install -d -m 700 -o ubuntu -g ubuntu /home/ubuntu/.ssh
curl -fsSL https://keys.example.com/example.keys \
  -o /home/ubuntu/.ssh/authorized_keys
chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
```

公钥目录适合在部署或受控同步时写入本地 `authorized_keys`。不要把远程 HTTP 服务放进每次 SSH 登录的实时认证链路。

网页使用 UnoCSS、Phosphor Icons、DM Sans 和 DM Mono 构建。字体文件随构建产物发布，不依赖运行时字体 CDN。

## 开源维护

项目使用 MIT License。安全问题请按照 `SECURITY.md` 私下报告；贡献流程见 `CONTRIBUTING.md`。GitHub Actions 会执行 lint、Worker 路由测试、Antfu UI 预检、Wrangler 类型检查、生产构建和部署 dry run。
