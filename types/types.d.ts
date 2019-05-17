import * as fastify from 'fastify';

declare module 'fastify' {
  interface FastifyRequest<
    HttpRequest,
    Query = fastify.DefaultQuery,
    Params = fastify.DefaultParams,
    Headers = fastify.DefaultHeaders,
    Body = any
  > {
    /** Allows to access or modify the session data. */
    session: Session;
    /** A session store. */
    sessionStore: FastifySessionPlugin.SessionStore;
    /** Allows to destroy the session in the store. */
    destroySession(callback: (err?: Error) => void): void;
  }

  interface Session extends Record<string, any> {
    sessionId: string;
    encryptedSessionId: string;
    /** Updates the `expires` property of the session. */
    touch(): void;
    /** Regenerates the session by generating a new `sessionId`. */
    regenerate(): void;
  }
}

declare interface FastifySessionPlugin<HttpServer, HttpRequest, HttpResponse>
  extends fastify.Plugin<HttpServer, HttpRequest, HttpResponse, FastifySessionPlugin.Options> {
  Store: { new (options?: any): FastifySessionPlugin.SessionStore };
}

declare namespace FastifySessionPlugin {
  interface SessionStore {
    set(sessionId: string, session: any, callback: (err?: Error) => void): void;
    get(sessionId: string, callback: (err?: Error, session?: any) => void): void;
    destroy(sessionId: string, callback: (err?: Error) => void): void;
  }

  interface Options {
    /** The secret used to sign the cookie. Must have length 32 or greater. */
    secret: string;
    /** The name of the session cookie. Defaults to `sessionId`. */
    cookieName?: string;
    /** The options object used to generate the `Set-Cookie` header of the session cookie. */
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
  }

  interface CookieOptions {
    /**  The `Path` attribute. Defaults to `/` (the root path).  */
    path?: string;
    /**  A `number` in milliseconds that specifies the `Expires` attribute by adding the specified milliseconds to the current date. If both `expires` and `maxAge` are set, then `expires` is used. */
    maxAge?: number;
    /**  The `boolean` value of the `HttpOnly` attribute. Defaults to true. */
    httpOnly?: boolean;
    /**  The `boolean` value of the `Secure` attribute. Set this option to false when communicating over an unencrypted (HTTP) connection. Defaults to true. */
    secure?: boolean;
    /**  The expiration `date` used for the `Expires` attribute. If both `expires` and `maxAge` are set, then `expires` is used. */
    expires?: Date | number;
    /** The `boolean` or `string` of the `SameSite` attribute.  */
    sameSite?: string | boolean;
    /**  The `Domain` attribute. */
    domain?: string;
  }
}

declare var FastifySessionPlugin: FastifySessionPlugin<any, any, any>;

export = FastifySessionPlugin;
