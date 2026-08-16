# Contributing

Thanks for helping improve SSH Key Directory.

## Development

Requirements:

- Node.js 22.13 or newer
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

`pnpm run test` includes a tracked-file privacy audit. Review the complete Git diff too, because automated secret patterns cannot determine whether every name, hostname, or public key was intended for publication.

## Configuration changes

Use synthetic public keys in tests. Never commit private keys, private-key stubs, PINs, recovery codes, `.key` files, or `.ppk` files.

Changes to supported algorithms, aliases, routing, caching, or validation should include a regression test in `scripts/check-key-directory.mjs`. UI changes must keep the Antfu pre-flight checks green and should be checked at desktop and mobile widths in both themes.

## Pull requests

Keep changes focused. Explain the user-visible behavior, security impact, and verification performed. Add screenshots only when the interface changed.
