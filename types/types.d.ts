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

interface SessionData extends ExpressSessionData {
  sessionId: string;

  encryptedSessionId: string;

  /** Updates the `expires` property of the session. */
  touch(): void;

  /**
   * Regenerates the session by generating a new `sessionId`.
   */
  regenerate(callback: (err?: Error) => void): void;
  regenerate(): Promise<void>;

  /** Allows to destroy the session in the store. */
  destroy(callback: (err?: Error) => void): void;
  destroy(): Promise<void>;

  /** Reloads the session data from the store and re-populates the request.session object. */
  reload(callback: (err?: Error) => void): void;
  reload(): Promise<void>;

  /** Save the session back to the store, replacing the contents on the store with the contents in memory. */
  save(callback: (err?: Error) => void): void;
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
      callback: (err?: Error) => void
    ): void;
    get(
      sessionId: string,
      callback: (err: Error | null, session: Fastify.Session) => void
    ): void;
    destroy(sessionId: string, callback: (err?: Error) => void): void;
  }

  interface Options {
    /**
     * The secret used to sign the cookie.
     *
     * Must be an array of strings, or a string with length 32 or greater. If an array, the first secret is used to
     * sign new cookies, and is the first one to be checked for incoming cookies.
     * Further secrets in the array are used to check incoming cookies, in the order specified.
     *
     * Note that the array may be manipulated by the rest of the application during its life cycle.
     * This can be done by storing the array in a separate variable that is later manipulated with mutating methods
     * like unshift(), pop(), splice(), etc.
     * This can be used to rotate the signing secret at regular intervals.
     * A secret should remain somewhere in the array as long as there are active sessions with cookies signed by it.
     * Secrets management is left up to the rest of the application.
     */
    secret: string | string[];

    /** The name of the session cookie. Defaults to `sessionId`. */
    cookieName?: string;

    /** If the cookie plugin is already signing the cookie this must be enabled.
     * Otherwise it has no effect on the request whatsoever */
    unsignSignedCookie?: boolean;

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

    /** Function used to generate new session IDs. Defaults to uid(24). */
    idGenerator?(request?: Fastify.FastifyRequest): string;
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
    callback: (err?: Error) => void
  ): void;
  get(
    sessionId: string,
    callback: (err: Error | null, session: Fastify.Session) => void
  ): void;
  destroy(sessionId: string, callback: (err?: Error) => void): void;
}

export const Store: MemoryStore;

declare const FastifySessionPlugin: FastifyPluginCallback<FastifySessionPlugin.Options>;
export default FastifySessionPlugin;
