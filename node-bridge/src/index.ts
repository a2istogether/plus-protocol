/**
 * Fast Protocol - High-speed, cross-platform custom network protocol for Node.js
 * 
 * Express-style API with full req/res support, middleware, controllers, etc.
 */

import { EventEmitter } from 'events';

// Placeholder for native module - in production this would load the actual Rust binary
// const native = require('../native');

/** Uploaded file interface */
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

/** Request object (Express-like) */
export class Request {
  public body: any;
  public params: Record<string, string> = {};
  public query: Record<string, string> = {};
  public headers: Record<string, string> = {};
  public files: Record<string, UploadedFile | UploadedFile[]> = {};
  public file?: UploadedFile; // Single file upload
  public method: string = 'GET';
  public url: string;
  public baseUrl: string = '';
  public originalUrl: string;
  
  constructor(
    public route: string,
    public path: string,
    public data: Buffer,
    public ip: string,
    public remoteAddr: string,
    headers?: Record<string, string>
  ) {
    this.url = route;
    this.originalUrl = route;
    this.headers = headers || {};
    this.parseUrl();
    this.parseBody();
  }
  
  /** Parse URL to extract query parameters */
  private parseUrl(): void {
    const urlParts = this.route.split('?');
    this.path = urlParts[0];
    
    if (urlParts[1]) {
      this.query = parseQueryString(urlParts[1]);
    }
  }
  
  /** Parse request body */
  private parseBody(): void {
    try {
      const text = this.data.toString('utf-8');
      // Try to parse as JSON
      this.body = JSON.parse(text);
    } catch {
      // If not JSON, keep as string
      this.body = this.data.toString('utf-8');
    }
  }
  
  /** Get body as JSON */
  json<T = any>(): T {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body as T;
  }
  
  /** Get body as text */
  text(): string {
    return this.data.toString('utf-8');
  }
  
  /** Get header value */
  get(header: string): string | undefined {
    return this.headers[header.toLowerCase()];
  }
  
  /** Get parameter value */
  param(name: string, defaultValue?: string): string | undefined {
    return this.params[name] || this.query[name] || defaultValue;
  }
  
  /** Check if request accepts given type */
  accepts(type: string): boolean {
    const accept = this.get('accept') || '';
    return accept.includes(type);
  }
  
  /** Check if request is of given type */
  is(type: string): boolean {
    const contentType = this.get('content-type') || '';
    return contentType.includes(type);
  }
}

/** Parse query string */
function parseQueryString(queryString: string): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (!queryString) return params;
  
  const pairs = queryString.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    params[key] = value || '';
  }
  
  return params;
}

/** Match route pattern with actual path */
function matchRoute(pattern: string, path: string): { matched: boolean; params: Record<string, string> } {
  const params: Record<string, string> = {};
  
  // Convert route pattern to regex
  // /users/:id -> /users/([^/]+)
  // /posts/:postId/comments/:commentId -> /posts/([^/]+)/comments/([^/]+)
  
  const paramNames: string[] = [];
  const regexPattern = pattern.replace(/:([^/]+)/g, (_, paramName) => {
    paramNames.push(paramName);
    return '([^/]+)';
  });
  
  const regex = new RegExp(`^${regexPattern}$`);
  const match = path.match(regex);
  
  if (!match) {
    return { matched: false, params: {} };
  }
  
  // Extract parameter values
  for (let i = 0; i < paramNames.length; i++) {
    params[paramNames[i]] = match[i + 1];
  }
  
  return { matched: true, params };
}

/** Response object (Express-like) */
export class Response {
  private _data: Buffer | null = null;
  private _status: number = 200;
  private _headers: Record<string, string> = {};
  private _sent: boolean = false;
  
  constructor() {}
  
  /** Set status code */
  status(code: number): this {
    this._status = code;
    return this;
  }
  
  /** Set header */
  set(field: string, value: string): this;
  set(headers: Record<string, string>): this;
  set(field: any, value?: any): this {
    if (typeof field === 'object') {
      Object.assign(this._headers, field);
    } else {
      this._headers[field] = value;
    }
    return this;
  }
  
  /** Get header */
  get(field: string): string | undefined {
    return this._headers[field];
  }
  
  /** Send response */
  send(data: any): void {
    if (this._sent) return;
    this._sent = true;
    
    if (typeof data === 'string') {
      this._data = Buffer.from(data);
    } else if (Buffer.isBuffer(data)) {
      this._data = data;
    } else {
      this._data = Buffer.from(JSON.stringify(data));
    }
  }
  
  /** Send JSON response */
  json(obj: any): void {
    this.set('Content-Type', 'application/json');
    this.send(JSON.stringify(obj));
  }
  
  /** Send text response */
  text(text: string): void {
    this.set('Content-Type', 'text/plain');
    this.send(text);
  }
  
  /** Send status with optional message */
  sendStatus(statusCode: number): void {
    this.status(statusCode);
    this.send(this.getStatusMessage(statusCode));
  }
  
  /** End response */
  end(data?: any): void {
    if (data !== undefined) {
      this.send(data);
    }
    this._sent = true;
  }
  
  /** Get response data */
  getData(): Buffer {
    return this._data || Buffer.alloc(0);
  }
  
  /** Check if response was sent */
  isSent(): boolean {
    return this._sent;
  }
  
  private getStatusMessage(code: number): string {
    const messages: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error'
    };
    return messages[code] || 'Unknown';
  }
}

/** Next function type */
export type NextFunction = (err?: any) => void | Promise<void>;

/** Route handler type */
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/** Middleware type */
export type MiddlewareFunction = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/** Error handler type */
export type ErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => void | Promise<void>;

/** Server configuration */
export interface ServerConfig {
  ackTimeout?: number;
  maxRetransmit?: number;
  heartbeatInterval?: number;
  encryption?: {
    algorithm: 'aes256' | 'chacha20';
    key: Buffer;
  };
  compression?: {
    algorithm: 'zstd' | 'lz4';
    level: number;
  };
}

/** Router class for organizing routes */
export class Router {
  private routes: Map<string, RouteHandler[]> = new Map();
  private middlewares: MiddlewareFunction[] = [];
  
  /**
   * Add middleware to router
   */
  use(middleware: MiddlewareFunction): this;
  use(path: string, middleware: MiddlewareFunction): this;
  use(path: string | MiddlewareFunction, middleware?: MiddlewareFunction): this {
    if (typeof path === 'function') {
      this.middlewares.push(path);
    } else if (middleware) {
      this.middlewares.push(middleware);
    }
    return this;
  }
  
  /**
   * Register route handler
   */
  route(path: string, ...handlers: RouteHandler[]): this {
    if (!this.routes.has(path)) {
      this.routes.set(path, []);
    }
    this.routes.get(path)!.push(...handlers);
    return this;
  }
  
  /**
   * Shorthand methods for routes
   */
  get(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  post(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  put(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  delete(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  /** Get all routes */
  getRoutes(): Map<string, RouteHandler[]> {
    return this.routes;
  }
  
  /** Get all middlewares */
  getMiddlewares(): MiddlewareFunction[] {
    return this.middlewares;
  }
}

/** Protocol Server (Express-like) */
export class Server extends EventEmitter {
  private routes: Map<string, RouteHandler[]> = new Map();
  private middlewares: MiddlewareFunction[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private addr: string = '';
  private config: ServerConfig;
  
  constructor(config?: ServerConfig) {
    super();
    this.config = config || {};
  }
  
  /**
   * Add middleware
   */
  use(middleware: MiddlewareFunction | Router | ErrorHandler): this {
    if (middleware instanceof Router) {
      // Add router's middlewares and routes
      this.middlewares.push(...middleware.getMiddlewares());
      middleware.getRoutes().forEach((handlers, path) => {
        if (!this.routes.has(path)) {
          this.routes.set(path, []);
        }
        this.routes.get(path)!.push(...handlers);
      });
    } else if (middleware.length === 4) {
      // Error handler (has 4 parameters: err, req, res, next)
      this.errorHandlers.push(middleware as ErrorHandler);
    } else {
      // Regular middleware
      this.middlewares.push(middleware as MiddlewareFunction);
    }
    return this;
  }
  
  /**
   * Register a route handler (Express-style)
   */
  route(path: string, ...handlers: RouteHandler[]): this {
    if (!this.routes.has(path)) {
      this.routes.set(path, []);
    }
    this.routes.get(path)!.push(...handlers);
    return this;
  }
  
  /**
   * Shorthand route methods
   */
  get(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  post(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  put(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  delete(path: string, ...handlers: RouteHandler[]): this {
    return this.route(path, ...handlers);
  }
  
  /**
   * Start listening on the specified address
   */
  async listen(addr: string): Promise<void>;
  async listen(port: number): Promise<void>;
  async listen(addrOrPort: string | number, callback?: () => void): Promise<void> {
    if (typeof addrOrPort === 'number') {
      this.addr = `127.0.0.1:${addrOrPort}`;
    } else {
      this.addr = addrOrPort;
    }
    
    console.log(`Server listening on ${this.addr}`);
    this.emit('listening', this.addr);
    
    if (callback) {
      callback();
    }
    
    // In production: native.createServer(addr) and start event loop
  }
  
  /**
   * Handle incoming request (internal)
   */
  async handleRequest(route: string, data: Buffer, remoteAddr: string, headers?: Record<string, string>): Promise<Buffer> {
    const req = new Request(route, route, data, remoteAddr, remoteAddr, headers);
    const res = new Response();
    
    try {
      // Find matching route (with params support)
      let matchedHandlers: RouteHandler[] | undefined;
      let matchedParams: Record<string, string> = {};
      
      // First try exact match
      if (this.routes.has(req.path)) {
        matchedHandlers = this.routes.get(req.path);
      } else {
        // Try pattern matching for dynamic routes
        for (const [pattern, handlers] of this.routes.entries()) {
          const match = matchRoute(pattern, req.path);
          if (match.matched) {
            matchedHandlers = handlers;
            matchedParams = match.params;
            break;
          }
        }
      }
      
      if (!matchedHandlers || matchedHandlers.length === 0) {
        throw new Error(`Cannot ${req.method} ${req.path} - Route not found`);
      }
      
      // Set route params
      req.params = matchedParams;
      
      // Build middleware + route handler chain
      const allHandlers = [...this.middlewares, ...matchedHandlers];
      let index = 0;
      
      const next: NextFunction = async (err?: any) => {
        if (err) {
          // Handle error
          await this.handleError(err, req, res);
          return;
        }
        
        if (index >= allHandlers.length) {
          return;
        }
        
        const handler = allHandlers[index++];
        await handler(req, res, next);
      };
      
      await next();
      
      // Return response data
      return res.getData();
      
    } catch (error) {
      await this.handleError(error, req, res);
      return res.getData();
    }
  }
  
  /**
   * Handle errors
   */
  private async handleError(error: any, req: Request, res: Response): Promise<void> {
    if (this.errorHandlers.length > 0) {
      let index = 0;
      const next: NextFunction = async () => {
        if (index >= this.errorHandlers.length) {
          // Default error response
          this.sendDefaultError(error, res);
          return;
        }
        const handler = this.errorHandlers[index++];
        await handler(error, req, res, next);
      };
      await next();
    } else {
      this.sendDefaultError(error, res);
    }
  }
  
  /**
   * Send default error response
   */
  private sendDefaultError(error: any, res: Response): void {
    if (!res.isSent()) {
      res.status(500).json({
        error: error.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
  
  /**
   * Close the server
   */
  async close(): Promise<void> {
    console.log('Server closed');
    this.emit('close');
  }
  
  /**
   * Set configuration
   */
  set(key: string, value: any): this {
    (this.config as any)[key] = value;
    return this;
  }
  
  /**
   * Get configuration
   */
  getConfig(key: string): any {
    return (this.config as any)[key];
  }
}

/** Client configuration */
export interface ClientConfig extends ServerConfig {
  timeout?: number;
}

/** Protocol Client */
export class Client extends EventEmitter {
  private bindAddr: string;
  private serverAddr: string;
  private config: ClientConfig;
  private connected: boolean;
  
  constructor(bindAddr: string, serverAddr: string, config?: ClientConfig) {
    super();
    this.bindAddr = bindAddr;
    this.serverAddr = serverAddr;
    this.config = config || {};
    this.connected = false;
  }
  
  /**
   * Connect to the server
   */
  async connect(): Promise<void> {
    console.log(`Connecting to ${this.serverAddr}...`);
    
    // In production: native.createClient() and native.clientConnect()
    this.connected = true;
    this.emit('connect');
  }
  
  /**
   * Send a request and wait for response
   * @param route - Route path
   * @param data - Request data
   * @returns Response data
   */
  async request(route: string, data: Buffer | string): Promise<Buffer> {
    if (!this.connected) {
      throw new Error('Client not connected');
    }
    
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    
    console.log(`Request: ${route}`);
    
    // In production: native.clientRequest(route, buffer)
    // For now, return mock response
    return Buffer.from(`Response for ${route}`);
  }
  
  /**
   * Send a request with JSON data
   * @param route - Route path
   * @param data - JSON data
   * @returns Parsed JSON response
   */
  async requestJson<T = any>(route: string, data: any): Promise<T> {
    const json = JSON.stringify(data);
    const response = await this.request(route, json);
    return JSON.parse(response.toString());
  }
  
  /**
   * Send data without waiting for response
   * @param route - Route path
   * @param data - Request data
   */
  async send(route: string, data: Buffer | string): Promise<void> {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    console.log(`Send: ${route}`);
    // In production: native.clientSend(route, buffer)
  }
  
  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Disconnected');
    this.emit('disconnect');
  }
}

/** Built-in Middleware */

/** Logging middleware */
export function logger(): MiddlewareFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const start = Date.now();
    console.log(`→ ${req.route} from ${req.ip}`);
    
    await next();
    
    const duration = Date.now() - start;
    console.log(`← ${req.route} ${res['_status']} (${duration}ms)`);
  };
}

/** JSON body parser middleware */
export function json(): MiddlewareFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.data.length > 0) {
        req.body = JSON.parse(req.data.toString('utf-8'));
      }
      await next();
    } catch (err) {
      next(new Error('Invalid JSON'));
    }
  };
}

/** URL encoded body parser */
export function urlencoded(options?: { extended?: boolean }): MiddlewareFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contentType = req.get('Content-Type') || '';
      
      if (contentType.includes('application/x-www-form-urlencoded')) {
        const text = req.data.toString('utf-8');
        req.body = parseUrlEncoded(text, options?.extended);
      }
      
      await next();
    } catch (err) {
      next(new Error('Invalid URL encoded data'));
    }
  };
}

/** Parse URL encoded data */
function parseUrlEncoded(text: string, extended: boolean = false): any {
  const params: any = {};
  
  if (!text) return params;
  
  const pairs = text.split('&');
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    
    if (extended && key.includes('[')) {
      // Handle nested objects: user[name]=John
      const match = key.match(/^([^\[]+)\[([^\]]*)\]$/);
      if (match) {
        const [, objKey, nestedKey] = match;
        if (!params[objKey]) params[objKey] = {};
        if (nestedKey) {
          params[objKey][nestedKey] = value;
        } else {
          // Array syntax: items[]=1
          if (!Array.isArray(params[objKey])) params[objKey] = [];
          params[objKey].push(value);
        }
        continue;
      }
    }
    
    // Check if key already exists (array values)
    if (params[key]) {
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      params[key] = value;
    }
  }
  
  return params;
}

/** Multipart form data parser (for file uploads) */
export function multipart(options?: { 
  limits?: { fileSize?: number; files?: number };
  fileFilter?: (file: UploadedFile) => boolean;
}): MiddlewareFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const contentType = req.get('Content-Type') || '';
      
      if (!contentType.includes('multipart/form-data')) {
        return next();
      }
      
      // Extract boundary
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) {
        return next(new Error('No boundary found in multipart data'));
      }
      
      const boundary = boundaryMatch[1];
      const parts = parseMultipart(req.data, boundary);
      
      req.body = {};
      req.files = {};
      
      let fileCount = 0;
      const maxFiles = options?.limits?.files || 10;
      const maxFileSize = options?.limits?.fileSize || 10 * 1024 * 1024; // 10MB
      
      for (const part of parts) {
        if (part.filename) {
          // File upload
          fileCount++;
          if (fileCount > maxFiles) {
            return next(new Error(`Too many files (max: ${maxFiles})`));
          }
          
          if (part.data.length > maxFileSize) {
            return next(new Error(`File too large (max: ${maxFileSize} bytes)`));
          }
          
          const file: UploadedFile = {
            fieldname: part.name,
            originalname: part.filename,
            encoding: part.encoding || '7bit',
            mimetype: part.contentType || 'application/octet-stream',
            buffer: part.data,
            size: part.data.length,
          };
          
          // Apply file filter if provided
          if (options?.fileFilter && !options.fileFilter(file)) {
            continue;
          }
          
          // Store file
          if (req.files[part.name]) {
            // Multiple files with same field name
            if (Array.isArray(req.files[part.name])) {
              (req.files[part.name] as UploadedFile[]).push(file);
            } else {
              req.files[part.name] = [req.files[part.name] as UploadedFile, file];
            }
          } else {
            req.files[part.name] = file;
            // Also set as req.file for single file uploads
            if (!req.file) {
              req.file = file;
            }
          }
        } else {
          // Regular form field
          req.body[part.name] = part.data.toString('utf-8');
        }
      }
      
      await next();
    } catch (err: any) {
      next(new Error(`Multipart parsing error: ${err.message}`));
    }
  };
}

/** Parse multipart form data */
function parseMultipart(buffer: Buffer, boundary: string): Array<{
  name: string;
  filename?: string;
  contentType?: string;
  encoding?: string;
  data: Buffer;
}> {
  const parts: any[] = [];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
  
  let start = 0;
  let end = 0;
  
  while (true) {
    // Find next boundary
    start = buffer.indexOf(boundaryBuffer, end);
    if (start === -1) break;
    
    start += boundaryBuffer.length;
    
    // Skip CRLF after boundary
    if (buffer[start] === 0x0d && buffer[start + 1] === 0x0a) {
      start += 2;
    }
    
    // Find end of this part (next boundary)
    end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) break;
    
    // Extract part
    const partBuffer = buffer.slice(start, end);
    
    // Find headers/body separator (double CRLF)
    const separatorIndex = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
    if (separatorIndex === -1) continue;
    
    const headers = partBuffer.slice(0, separatorIndex).toString('utf-8');
    const data = partBuffer.slice(separatorIndex + 4, partBuffer.length - 2); // -2 for trailing CRLF
    
    // Parse headers
    const part: any = { data };
    
    const dispositionMatch = headers.match(/Content-Disposition: form-data; name="([^"]+)"(?:; filename="([^"]+)")?/i);
    if (dispositionMatch) {
      part.name = dispositionMatch[1];
      part.filename = dispositionMatch[2];
    }
    
    const contentTypeMatch = headers.match(/Content-Type: (.+)/i);
    if (contentTypeMatch) {
      part.contentType = contentTypeMatch[1].trim();
    }
    
    const encodingMatch = headers.match(/Content-Transfer-Encoding: (.+)/i);
    if (encodingMatch) {
      part.encoding = encodingMatch[1].trim();
    }
    
    parts.push(part);
  }
  
  return parts;
}

/** CORS middleware */
export function cors(options?: any): MiddlewareFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.set('Access-Control-Allow-Origin', options?.origin || '*');
    res.set('Access-Control-Allow-Methods', options?.methods || 'GET,POST,PUT,DELETE');
    res.set('Access-Control-Allow-Headers', options?.headers || 'Content-Type');
    await next();
  };
}

/** Rate limiting middleware */
export function rateLimit(options: { max: number; windowMs: number }): MiddlewareFunction {
  const requests = new Map<string, number[]>();
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const now = Date.now();
    const key = req.ip;
    
    if (!requests.has(key)) {
      requests.set(key, []);
    }
    
    const userRequests = requests.get(key)!;
    const recentRequests = userRequests.filter(time => now - time < options.windowMs);
    
    if (recentRequests.length >= options.max) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    
    recentRequests.push(now);
    requests.set(key, recentRequests);
    
    await next();
  };
}

/** Error handling middleware */
export function errorHandler(): ErrorHandler {
  return async (err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.error('Error:', err);
    
    if (!res.isSent()) {
      res.status(500).json({
        error: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
  };
}

/** Not found middleware */
export function notFound(): MiddlewareFunction {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.status(404).json({
      error: 'Not Found',
      path: req.route
    });
  };
}

/** Create an Express-like server instance */
export function createServer(config?: ServerConfig): Server {
  return new Server(config);
}

/** Create a router */
export function createRouter(): Router {
  return new Router();
}

// Export job queue
export * from './jobs';
export { JobQueue, createQueue, JobStatus, JobPriority } from './jobs';
export type { Job, JobHandler, JobConfig, QueueStats } from './jobs';

// Export everything
export default {
  Server,
  Client,
  Router,
  Request,
  Response,
  createServer,
  createRouter,
  logger,
  json,
  urlencoded,
  multipart,
  cors,
  rateLimit,
  errorHandler,
  notFound,
};

