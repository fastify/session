/// <reference types='node' />

import { FastifyPluginCallback } from 'fastify';
import type * as Fastify from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    /** Allows to access or modify the session data. */
    session: Fastify.Session;

    /** A session store. */
    sessionStore: Readonly<FastifySessionPlugin.SessionStore>;
  }

  interface Session extends SessionData {}
}

type Callback = (err?: Error) => void;
type CallbackSession = (err: Error | null, result: Fastify.Session) => void;

interface SessionData extends ExpressSessionData {
  sessionId: string;

  encryptedSessionId: string;

  /** Updates the `expires` property of the session's cookie. */
  touch(): void;

  /**
   * Regenerates the session by generating a new `sessionId`.
   */
  regenerate(callback: Callback): void;
  regenerate(): Promise<void>;

  /** Allows to destroy the session in the store. */
  destroy(callback: Callback): void;
  destroy(): Promise<void>;

  /** Reloads the session data from the store and re-populates the request.session object. */
  reload(callback: Callback): void;
  reload(): Promise<void>;

  /** Save the session back to the store, replacing the contents on the store with the contents in memory. */
  save(callback: Callback): void;
  save(): Promise<void>;

  /** sets values in the session. */
  set(key: string, value: unknown): void;

  /** gets values from the session. */
  get<T>(key: string): T;

  /** checks if session has been modified since it was generated or loaded from the store. */
  isModified(): boolean;
}

interface ExpressSessionData {
  cookie: FastifySessionPlugin.CookieOptions;
}

declare namespace FastifySessionPlugin {
  interface SessionStore {
    set(
      sessionId: string,
      session: Fastify.Session,
      callback: Callback
    ): void;
    get(
      sessionId: string,
      callback: CallbackSession
    ): void;
    destroy(sessionId: string, callback: Callback): void;
  }

  interface Options {
    /** The name of the session cookie. Defaults to `sessionId`. */
    cookieName?: string;

    /**
     * The options object used to generate the `Set-Cookie` header of the session cookie.
     *
     * @link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
     */
    cookie?: CookieOptions;

    /**
     * A session store.
     * Compatible to stores from express-session.
     * Defaults to a simple in memory store.
     * Note: The default store should not be used in a production environment because it will leak memory.
     */
    store?: FastifySessionPlugin.SessionStore;

    /**
     * Save sessions to the store, even when they are new and not modified.
     * Defaults to true. Setting this to false can be useful to save storage space and to comply with the EU cookie law.
     */
    saveUninitialized?: boolean;

    /**
     * Force the session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown.
     * Defaults to true. This is typically used in conjuction with short, non-session-length maxAge values to provide a quick timeout of the session data with reduced potential of it occurring during on going server interactions.
     */
    rolling?: boolean;

    /** Function used to generate new session IDs. */
    idGenerator?(request?: Fastify.FastifyRequest): string;

    /**
     * Prefixes all cookie values. Run with "s:" to be be compatible with express-session.
     * Defaults to ""
     */
     cookiePrefix?: string;
  }

  interface CookieOptions {
    /**  The `Path` attribute. Defaults to `/` (the root path).  */
    path?: string;

    /**  A `number` in milliseconds that specifies the `Expires` attribute by adding the specified milliseconds to the current date. If both `expires` and `maxAge` are set, then `expires` is used. */
    maxAge?: number;

    /**  The `boolean` value of the `HttpOnly` attribute. Defaults to true. */
    httpOnly?: boolean;

    /**  The `boolean` value of the `Secure` attribute. Set this option to false when communicating over an unencrypted (HTTP) connection. Value can be set to `auto`; in this case the `Secure` attribute will be set to false for HTTP request, in case of HTTPS it will be set to true.  Defaults to true. */
    secure?: boolean | 'auto';

    /**  The expiration `date` used for the `Expires` attribute. If both `expires` and `maxAge` are set, then `expires` is used. */
    expires?: Date;

    /** A `boolean` or one of the `SameSite` string attributes. E.g.: `lax`, `node` or `strict`.  */
    sameSite?: 'lax' | 'none' | 'strict' | boolean;

    /**  The `Domain` attribute. */
    domain?: string;
  }
}

export class MemoryStore implements FastifySessionPlugin.SessionStore {
  constructor(map?: Map<string, Fastify.Session>);
  set(
    sessionId: string,
    session: Fastify.Session,
    callback: Callback
  ): void;
  get(
    sessionId: string,
    callback: CallbackSession
  ): void;
  destroy(sessionId: string, callback: Callback): void;
}

export const Store: MemoryStore;

declare const FastifySessionPlugin: FastifyPluginCallback<FastifySessionPlugin.Options>;
export default FastifySessionPlugin;
