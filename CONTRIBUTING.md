# Contributing

Thanks for helping improve SSH Key Directory.

## Development

Requirements:

- Node.js 22.6 or newer
- pnpm 10 or newer

Install dependencies and run the local Worker:

```bash
pnpm install
pnpm run dev
```

Run the full verification suite before opening a pull request:

```bash
pnpm run check
pnpm run deploy:dry-run
```

## Configuration changes

Use synthetic public keys in tests. Never commit private keys, private-key stubs, PINs, recovery codes, `.key` files, or `.ppk` files.

Changes to supported algorithms, aliases, routing, caching, or validation should include a regression test in `scripts/check-key-directory.mjs`. UI changes must keep the Antfu pre-flight checks green and should be checked at desktop and mobile widths in both themes.

## Pull requests

Keep changes focused. Explain the user-visible behavior, security impact, and verification performed. Add screenshots only when the interface changed.
