# Security policy

## Supported versions

Security fixes are applied to the latest release and the default branch.

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/IZUMI-Zu/ssh-key-directory/security/advisories/new) for sensitive reports. Do not include private keys, private-key stubs, PINs, recovery codes, API tokens, or server credentials in an issue, discussion, log, screenshot, or reproduction repository.

Include the affected route or component, the expected security boundary, reproduction steps using synthetic keys, and the practical impact. You should receive an acknowledgement within seven days.

## Security model

SSH Key Directory publishes public credentials. It never needs private-key material. Repository write access and the Cloudflare deployment pipeline are security boundaries because a malicious change could alter the keys later provisioned to a server.

Use the service during controlled provisioning or synchronization. Do not make a remote HTTP request part of every live SSH authentication attempt. Review changes to the directory configuration used by your deployment, require CI, and protect the deployment branch.
