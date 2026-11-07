-- Atlas only. Never apply backend/schema.sql to the shared Trading project.
create table public.atlas_access (
 id text primary key check (id = 'atlas'), password_hash text not null,
 salt text not null, iterations integer not null check (iterations >= 210000),
 auth_version integer not null default 1, allowed_origin text not null,
 updated_at timestamptz not null default now()
);
create table public.atlas_sessions (
 token_hash text primary key, auth_version integer not null,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index atlas_sessions_expiry on public.atlas_sessions(expires_at);
create table public.atlas_workspace (
 id text primary key check (id = 'default'), data jsonb,
 revision bigint not null default 0, updated_at timestamptz not null default now()
);
insert into public.atlas_workspace(id) values ('default');
create table public.atlas_connections (
 id uuid primary key, name text not null, provider text not null check(provider in ('deepseek','gemini')),
 model text not null, enabled boolean not null default true, encrypted_key text not null,
 updated_at timestamptz not null default now()
);
create table public.atlas_login_limits (
 bucket text primary key, attempts integer not null default 1,
 created_at timestamptz not null default now()
);
create function public.atlas_rate_limit(p_bucket text) returns integer
 language plpgsql security invoker set search_path = '' as $$
 declare n integer;
 begin
 delete from public.atlas_login_limits where created_at < now() - interval '1 day';
 insert into public.atlas_login_limits(bucket) values(p_bucket)
 on conflict(bucket) do update set attempts=public.atlas_login_limits.attempts+1
 returning attempts into n;
 return n;
 end $$;
create function public.atlas_change_password(p_version integer,p_hash text,p_salt text,p_iterations integer)
 returns boolean language plpgsql security invoker set search_path = '' as $$
 begin
 update public.atlas_access set password_hash=p_hash,salt=p_salt,iterations=p_iterations,
 auth_version=auth_version+1,updated_at=now() where id='atlas' and auth_version=p_version;
 if not found then return false; end if;
 delete from public.atlas_sessions where auth_version <= p_version;
 return true;
 end $$;
alter table public.atlas_access enable row level security;
alter table public.atlas_sessions enable row level security;
alter table public.atlas_workspace enable row level security;
alter table public.atlas_connections enable row level security;
alter table public.atlas_login_limits enable row level security;
revoke all on public.atlas_access,public.atlas_sessions,public.atlas_workspace,public.atlas_connections,public.atlas_login_limits from public,anon,authenticated;
grant all on public.atlas_access,public.atlas_sessions,public.atlas_workspace,public.atlas_connections,public.atlas_login_limits to service_role;
revoke all on function public.atlas_rate_limit(text),public.atlas_change_password(integer,text,text,integer) from public,anon,authenticated;
grant execute on function public.atlas_rate_limit(text),public.atlas_change_password(integer,text,text,integer) to service_role;
