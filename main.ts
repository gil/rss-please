import { serve } from 'https://deno.land/std@0.179.0/http/server.ts';
import * as neocities from './neocities.ts';

const handler = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  console.log(`${ path } : Request at ${ new Date() }`);

  if( memCacheTime[path] && Date.now() < memCacheTime[path] + CACHE_EXPIRES_TIMEOUT ) {
    console.log(`${ path } : Responding from cache`);
    return memCacheResponse[path].clone();
  } else {
    const response = await router(request);

    if( response ) {
      console.log(`${ path } : Fresh response`);
      memCacheTime[path] = Date.now();
      memCacheResponse[path] = response.clone();
      return response;
    }
  }

  return new Response('damn...', {
    status: 404,
  });
};

// TODO: Move this to its own file
const router = async (request: Request): Promise<Response | null> => {
  const url = new URL(request.url);

  if( url.pathname === '/neocities' ) {
    return await neocities.handler(request);
  }

  return null;
}

// TODO: Move this to its own file
const CACHE_EXPIRES_TIMEOUT = 5 * 60 * 1000;
const memCacheTime: Record<string, number> = {};
const memCacheResponse: Record<string, Response> = {};

serve(handler, { port: 3333 });
