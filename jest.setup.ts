import { TextDecoder, TextEncoder } from 'util';

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder });
}

if (typeof globalThis.TextDecoder === 'undefined') {
  Object.assign(globalThis, { TextDecoder });
}
