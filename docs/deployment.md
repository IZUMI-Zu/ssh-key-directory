# Deployment guide

[Back to README](../README.md) | [简体中文](./deployment.zh-CN.md)

SSH Key Directory supports two deployment workflows. Both publish the same Worker and responsive web interface.

| Workflow | Best for | Directory configuration used by the build |
| --- | --- | --- |
| Deploy to Cloudflare | A quick fork with automatic builds | Tracked `keys/directory.config.example.ts` in your fork |
| Local Wrangler | Personal deployments controlled from your computer | Git-ignored `keys/directory.config.ts` |

Only public SSH keys belong in either file. Never add private keys, security-key stubs, PINs, recovery codes, `.key` files, or `.ppk` files.

## Prerequisites

- A Cloudflare account
- Node.js 22.13 or newer and pnpm 10 or newer for the local workflow
- A Cloudflare-managed DNS zone only if you want a Custom Domain
- A public GitHub or GitLab repository if you use the Deploy to Cloudflare button

## Option 1: Deploy to Cloudflare

Use the button in the [README](../README.md), then:

1. Sign in to Cloudflare and select an account.
2. Choose the repository and Worker names.
3. Let Cloudflare clone, build, and deploy the project.
4. Open the generated repository in your Git provider.
5. Replace the identities, aliases, groups, and public keys in `keys/directory.config.example.ts`.
6. Commit and push the change. Workers Builds will publish the updated directory.

The initial deployment intentionally contains the safe example directory. Cloud builds start from a clean checkout, so `pnpm run config:init` copies the tracked example to the ignored runtime configuration before building.

Do not send a pull request containing your deployment-specific directory back to the upstream project.

Verify the deployment with the `workers.dev` URL shown by Cloudflare:

```bash
curl -fsSL https://<worker>.<account-subdomain>.workers.dev/healthz
curl -fsSL https://<worker>.<account-subdomain>.workers.dev/<handle>.keys
```

## Option 2: Deploy with Wrangler

Fork or clone the repository, then install dependencies and create the local configuration:

```bash
pnpm install
pnpm run config:init
```

Edit `keys/directory.config.ts`. This file is ignored by Git and is not overwritten by install, development, test, or build commands.

Validate and deploy:

```bash
pnpm run check
pnpm run cloudflare:login
pnpm run deploy:dry-run
pnpm run deploy
```

`pnpm run deploy` builds the Worker and static assets before running `wrangler deploy`. The default `wrangler.jsonc` enables a Cloudflare-provided `workers.dev` hostname.

Check the authenticated account at any time with:

```bash
pnpm run cloudflare:whoami
```

## Add a Custom Domain

The simplest option after any deployment is Cloudflare Dashboard > Workers & Pages > your Worker > Settings > Domains & Routes > Add > Custom Domain.

For a configuration-as-code local deployment, copy the provided example:

```bash
cp wrangler.custom.example.jsonc wrangler.local.jsonc
```

PowerShell:

```powershell
Copy-Item wrangler.custom.example.jsonc wrangler.local.jsonc
```

Edit the exact hostname in `wrangler.local.jsonc`:

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

Do not include `https://`, a path, or a wildcard. The hostname must belong to an active zone in the selected Cloudflare account. Validate and deploy it with:

```bash
pnpm run deploy:custom:dry-run
pnpm run deploy:custom
```

Wrangler registers the Custom Domain during deployment. `wrangler.local.jsonc` is ignored so your personal hostname does not leak into the reusable upstream repository.

For Git-based automatic builds, add the same `routes` entry to the tracked `wrangler.jsonc` in your fork, or configure the domain in the Cloudflare dashboard.

## Add or rotate keys after deployment

For a local Wrangler deployment:

1. Edit `keys/directory.config.ts`.
2. Run `pnpm run check`.
3. Run `pnpm run deploy` or `pnpm run deploy:custom`.
4. Verify the canonical and alias endpoints.

For a Deploy to Cloudflare or Workers Builds deployment:

1. Edit `keys/directory.config.example.ts` in your deployment fork.
2. Commit and push the change.
3. Wait for the Cloudflare build to finish.
4. Verify the deployed endpoints.

Useful verification requests:

```bash
curl -fsSL https://keys.example.com/<handle>.keys
curl -fsSL https://keys.example.com/<alias>.json
curl -fsSL 'https://keys.example.com/<handle>.keys?type=ed'
curl -fsSL https://keys.example.com/fingerprints.json
curl -fsSL https://keys.example.com/healthz
```

Use `https://` explicitly. `curl keys.example.com/...` may display Cloudflare's HTTP `301` response instead of following the redirect. The `-L` flag in `curl -fsSL` follows redirects.

## Install keys on a server

Fetch to a temporary file first so a failed request cannot replace a working `authorized_keys` file:

```bash
temp_keys="$(mktemp)"
trap 'rm -f "$temp_keys"' EXIT

curl -fsSL https://keys.example.com/groups/operators.keys -o "$temp_keys"
install -d -m 700 -o ubuntu -g ubuntu /home/ubuntu/.ssh
install -m 600 -o ubuntu -g ubuntu "$temp_keys" /home/ubuntu/.ssh/authorized_keys
```

Replace the user, group, and endpoint for your server. Prefer a group endpoint when several operators should share access. Fetch during provisioning or a controlled synchronization job, not during every SSH authentication attempt.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Cloud deployment still shows the example users | Edit and push `keys/directory.config.example.ts` in the deployment fork |
| Local deployment ignores a change to the example | Edit the existing `keys/directory.config.ts`; initialization never overwrites it |
| `curl` prints `301 Moved Permanently` | Use an `https://` URL and `curl -fsSL` |
| Custom Domain deployment fails | Confirm the hostname is in an active Cloudflare zone and does not conflict with another record or Worker |
| A valid `?type=` request returns `404` | The selected identity or group has no key of that type |
| An unknown `?type=` returns `400` | Use a supported shorthand, alias, or full OpenSSH type |

Inspect live logs or roll back a bad deployment with:

```bash
pnpm run cloudflare:tail
pnpm run cloudflare:versions
pnpm run cloudflare:rollback
```
