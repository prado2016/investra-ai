declare module 'mailparser' {
  import type { Readable } from 'stream';

  export interface ParsedAddressObject {
    text?: string;
  }

  export interface ParsedMail {
    text?: string | null;
    html?: string | false | null;
    subject?: string | null;
    from?: ParsedAddressObject | null;
  }

  export function simpleParser(source: Readable | Buffer | string): Promise<ParsedMail>;
}
