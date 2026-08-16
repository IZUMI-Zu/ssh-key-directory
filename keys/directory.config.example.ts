import { defineDirectoryConfig } from '../worker/key-directory.ts'

// These public keys were generated for this example. No matching private keys are retained.
export default defineDirectoryConfig({
  identities: [
    {
      handle: 'example',
      displayName: 'Example User',
      aliases: ['demo'],
      keys: [
        {
          type: 'ed25519',
          publicKey: 'AAAAC3NzaC1lZDI1NTE5AAAAIIvcPXZU5dHyIS43BpBJ/Rl7/G0a56u08wAPXHO5GtSF',
          comment: 'example@laptop',
        },
      ],
    },
    {
      handle: 'teammate',
      displayName: 'Example Teammate',
      aliases: ['team'],
      keys: [
        {
          type: 'ed',
          publicKey: 'AAAAC3NzaC1lZDI1NTE5AAAAIGKosRYR9asJhYKpJ01aZ8q1Uace7FmYrmqqvGwEGY1I',
          options: 'restrict',
          comment: 'teammate@workstation',
        },
      ],
    },
  ],
  groups: [
    {
      handle: 'operators',
      displayName: 'Example Operators',
      aliases: ['ops'],
      members: ['example', 'team'],
    },
  ],
})
