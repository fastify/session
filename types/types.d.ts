/// <reference types='node' />

import type * as Fastify from 'fastify';
import { FastifyPluginCallback } from 'fastify';
import { CookieSerializeOptions } from "@fastify/cookie"

declare module 'fastify' {
  interface FastifyInstance {
    decryptSession<Request extends Record<string, any> = FastifyRequest>(sessionId: string, request: Request, cookieOpts: fastifySession.CookieOptions, callback: Callback): void;
    decryptSession<Request extends Record<string, any> = FastifyRequest>(sessionId: string, request: Request, callback: Callback): void;
  }

  interface FastifyRequest {
    /** Allows to access or modify the session data. */
    session: fastifySession.FastifySessionObject;

    /** A session store. */
    sessionStore: Readonly<fastifySession.SessionStore>;
  }
  
  interface Session extends ExpressSessionData { }
}

type FastifySession = FastifyPluginCallback<fastifySession.FastifySessionOptions> & {
  Store: fastifySession.MemoryStore,
  MemoryStore: fastifySession.MemoryStore,
}

type Callback = (err?: any) => void;
type CallbackSession = (err: any, result?: Fastify.Session | null) => void;

interface ExpressSessionData {
  /** The cookie properties as defined by express-session */
  cookie: {
    originalMaxAge: number | null;
    maxAge?: number;
    signed?: boolean;
    expires?: Date | null;
    httpOnly?: boolean;
    path?: string;
    domain?: string;
    secure?: boolean | 'auto';
    sameSite?: boolean | 'lax' | 'strict' | 'none';
  }
}

interface UnsignResult {
  valid: boolean;
  renew: boolean;
  value: string | null;
}

interface Signer {
  sign: (value: string) => string;
  unsign: (input: string) => UnsignResult;
}

declare namespace fastifySession {

  export interface FastifySessionObject extends Fastify.Session {
    sessionId: string;

    encryptedSessionId: string;

    /** Updates the `expires` property of the session's cookie. */
    touch(): void;

    /**
     * Regenerates the session by generating a new `sessionId`.
     *
     * ignoreFields specifies which fields should be kept in the new session object.
     */
    regenerate(callback: Callback): void;
    regenerate(ignoreFields: string[], callback: Callback): void;
    regenerate(): Promise<void>;
    regenerate(ignoreFields: string[]): Promise<void>;

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
    set<K extends keyof Fastify.Session, V = Fastify.Session[K]>(key: K, value: V): void;

    /** gets values from the session. */
    get<K extends keyof Fastify.Session, V = Fastify.Session[K] | undefined>(key: K): V;

    /** checks if session has been modified since it was generated or loaded from the store. */
    isModified(): boolean;
  }

  export interface SessionStore {
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

  export interface FastifySessionOptions {
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
    secret: string | string[] | Signer;

    /**
     * The algorithm used to sign the cookie.
     * 
     * @default 'sha256'
     */
    algorithm?: string;

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
    store?: fastifySession.SessionStore;

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

  export interface CookieOptions extends Omit<CookieSerializeOptions, 'signed'> {}

  export class MemoryStore implements fastifySession.SessionStore {
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

  export const fastifySession: FastifySession
  export { fastifySession as default }
}

declare function fastifySession(...params: Parameters<FastifySession>): ReturnType<FastifySession>
export = fastifySession

