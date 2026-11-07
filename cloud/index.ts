import {createGateway,restStore} from './gateway.mjs';
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
if(!secret)throw new Error('Missing server credentials');
Deno.serve(createGateway({db:restStore(Deno.env.get('SUPABASE_URL'),secret),secret:Deno.env.get('ATLAS_ENCRYPTION_KEY')||secret}));
