# SSH Key Directory

<img src="./public/favicon.svg" align="right" width="72" height="72" alt="SSH Key Directory logo">

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![CI](https://github.com/IZUMI-Zu/ssh-key-directory/actions/workflows/ci.yml/badge.svg)](https://github.com/IZUMI-Zu/ssh-key-directory/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-3f7446.svg)](./LICENSE)
[![TypeScript 6](https://img.shields.io/badge/TypeScript-6-3178c6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19-149eca.svg?logo=react&logoColor=white)](https://react.dev/)
[![UnoCSS 66](https://img.shields.io/badge/UnoCSS-66-333333.svg?logo=unocss&logoColor=white)](https://unocss.dev/)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/IZUMI-Zu/ssh-key-directory)

A config-as-code SSH public key directory for Cloudflare Workers. It provides GitHub-style `.keys` endpoints, identity groups, aliases, JSON metadata, fingerprints, and a responsive inspection UI without a database.

## Contents

- [Configure identities and keys](#configure-identities-and-keys)
- [Groups](#groups)
- [Key type aliases](#key-type-aliases)
- [Local development](#local-development)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Open-source maintenance](#open-source-maintenance)

## Configure identities and keys

Deployment-specific directory data lives in the Git-ignored `keys/directory.config.ts`. The repository tracks a [complete example configuration](./keys/directory.config.example.ts) with two identities, aliases, restricted key options, and a group. `pnpm install`, `pnpm run dev`, and `pnpm run build` create the local file from that example only when it does not already exist, so an existing personal configuration is never overwritten.

Choose the file according to how the project is deployed:

| Deployment workflow | File to edit |
| --- | --- |
| Local Wrangler deployment | `keys/directory.config.ts` |
| Deploy to Cloudflare or Workers Builds | `keys/directory.config.example.ts` in your deployment fork |

Cloud builds use a clean Git checkout and therefore cannot read the ignored local file. The tracked example becomes the build input for Git-based deployments.

Keep a personal configuration untracked in a public checkout, or deliberately version it in a private deployment fork. An identity has a canonical handle, a display name, optional aliases, and any number of public keys:

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

To add another person, append an entry to the `identities` array. The following entry exposes `/teammate.keys`, `/tm.keys`, and the corresponding JSON and API routes:

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

Set `publicKey` to only the Base64 portion of an OpenSSH public key. Public keys are not secrets, but keeping deployment identities outside the reusable upstream repository prevents forks from accidentally deploying someone else's access list. Never commit a private key, private-key stub, PIN, recovery code, `.key` file, or `.ppk` file.

## Groups

Groups combine keys from multiple identities into one fingerprint-deduplicated `authorized_keys` endpoint. Groups may have aliases, and their members may reference either canonical identity handles or identity aliases:

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

This configuration exposes:

```text
GET /groups/operators.keys
GET /groups/ops.keys
GET /groups/operators.json
GET /api/v1/groups
GET /api/v1/groups/operators
GET /api/v1/groups/ops
```

Group endpoints also accept the optional `?type=` query parameter, such as `/groups/operators.keys?type=ecdsa-sk`. When the same key belongs to more than one member, it appears only once in the group response.

## Key type aliases

| Canonical shorthand | Accepted aliases | Published OpenSSH type |
| --- | --- | --- |
| `ed25519` | `ed` | `ssh-ed25519` |
| `ed25519-sk` | `sk-ed25519`, `ed-sk` | `sk-ssh-ed25519@openssh.com` |
| `ecdsa-p256` | `ecdsa`, `p256` | `ecdsa-sha2-nistp256` |
| `ecdsa-p384` | `p384` | `ecdsa-sha2-nistp384` |
| `ecdsa-p521` | `p521` | `ecdsa-sha2-nistp521` |
| `ecdsa-sk` | `sk-ecdsa`, `p256-sk` | `sk-ecdsa-sha2-nistp256@openssh.com` |
| `pq` | `mldsa44`, `ml-dsa` | `ssh-mldsa44-ed25519@openssh.com` |
| `rsa` | `rsa-key` | `ssh-rsa` |

Canonical shorthands, aliases, and complete OpenSSH type names are accepted in the configuration file and in `?type=` queries. Matching is case-insensitive. The `options` field accepts `authorized_keys` options such as `cert-authority`, `restrict`, `verify-required`, and `no-touch-required`.

The Worker validates handle and alias collisions, algorithms, Base64 SSH data headers, duplicate fingerprints, and the 8 KiB line-length limit. It also calculates standard `SHA256:` fingerprints.

## Local development

```bash
pnpm install
pnpm run check
pnpm run dev
```

`pnpm run test` runs the Worker route tests and the automated Antfu UI preflight. Responsive layout, dark mode, and visual hierarchy should still be checked in a browser.

Common endpoints:

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

`/api/v1/directory` returns all identities and their keys. Canonical handles and aliases resolve to the same directory entry. Responses include CORS, ETag, and cache-revalidation headers.

Use the `type` query parameter to request one key type. Identity aliases and key type aliases can be combined:

```text
GET /example.keys?type=ed25519
GET /demo.keys?type=ed
GET /example.json?type=ssh-ed25519
GET /api/v1/identities/demo?type=ed
GET /groups/operators.keys?type=ed
GET /api/v1/groups/ops?type=ssh-ed25519
```

An unknown key type returns `400`. A valid type that the requested identity does not have returns `404`.

## Project structure

```text
keys/                  Example and local directory configuration
src/components/        Responsive React page sections and controls
src/directory.ts       Browser-side API response types and guards
worker/                Worker router, validation, and key serialization
docs/                  English and Chinese deployment tutorials
scripts/               Configuration, UI, key, and documentation checks
wrangler.jsonc         Default workers.dev deployment
```

`src/App.tsx` only coordinates data loading, selection, theme state, and the extracted page sections.

## Deployment

See the [complete deployment guide](./docs/deployment.md) for Deploy to Cloudflare, local Wrangler, Custom Domains, key rotation, server installation, and troubleshooting.

The **Deploy to Cloudflare** button at the top clones this public repository, configures Workers Builds, and deploys it. The first deployment uses the safe example directory. Edit and push `keys/directory.config.example.ts` in the generated deployment fork to publish your own public keys.

For a local Wrangler deployment, edit the ignored `keys/directory.config.ts`, then run:

```bash
pnpm run check
pnpm exec wrangler login
pnpm run deploy:dry-run
pnpm run deploy
```

The default configuration deploys to a Cloudflare-provided `workers.dev` domain. For a Custom Domain, copy the example to the ignored local configuration and edit its exact hostname:

```powershell
Copy-Item wrangler.custom.example.jsonc wrangler.local.jsonc
```

Then deploy with:

```bash
pnpm run deploy:custom
```

Run `pnpm run deploy:custom:dry-run` to validate the local configuration without publishing it. The Custom Domain must belong to an active zone in the current Cloudflare account and must not conflict with an existing record. Do not commit your personal `wrangler.local.jsonc` when publishing a fork.

After adding or rotating a key, run the checks and deploy again. Git-based deployments instead require updating and pushing the tracked example in the deployment fork. The [deployment guide](./docs/deployment.md#add-or-rotate-keys-after-deployment) explains both update paths.

Example server bootstrap:

```bash
install -d -m 700 -o ubuntu -g ubuntu /home/ubuntu/.ssh
curl -fsSL https://keys.example.com/example.keys \
  -o /home/ubuntu/.ssh/authorized_keys
chown ubuntu:ubuntu /home/ubuntu/.ssh/authorized_keys
chmod 600 /home/ubuntu/.ssh/authorized_keys
```

Use the directory to write a local `authorized_keys` file during deployment or controlled synchronization. Do not place a remote HTTP service in the live authentication path of every SSH login.

The web interface uses UnoCSS, Phosphor Icons, DM Sans, and DM Mono. Font files ship with the build and do not require a runtime font CDN.

## Open-source maintenance

The project uses the MIT License. Follow `SECURITY.md` to report security issues privately and see `CONTRIBUTING.md` for the contribution workflow. GitHub Actions runs linting, Worker route tests, the Antfu UI preflight, Wrangler type checks, a production build, and a deployment dry run.
