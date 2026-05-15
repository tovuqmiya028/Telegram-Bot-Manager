import { TelegramClient } from 'telegram';

// This is a workaround for an esbuild tree-shaking issue where it incorrectly
// removes the static `passwordToHash` method from the TelegramClient class.
// By explicitly importing and re-exporting it, we signal to the bundler that
// these components are in use and should not be removed.
export const GramClient = TelegramClient;
export const hashPassword = TelegramClient.passwordToHash;
