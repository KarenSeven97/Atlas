-- Optional PostgreSQL/Supabase schema. Run in a development database first.
-- No secrets or live connection are shipped. All exposed tables use owner RLS.
begin;
create table public.instruments (id text primary key, user_id uuid not null references auth.users(id), name text not null, market text not null, sector text, timezone text not null, start_date date);
create table public.events (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id), title text not null, occurred_on date not null, occurred_at timestamptz, first_published_at timestamptz, effective_at timestamptz, region text, category text, importance int check(importance between 1 and 5), impact text, summary text, hypothesis text, uncertainty text, tags text[] default '{}');
create table public.news_articles (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),title text not null,url text,source text,published_at timestamptz,verified boolean default false);
create table public.event_news (event_id uuid references public.events on delete cascade,news_id uuid references public.news_articles on delete cascade,user_id uuid not null references auth.users(id),primary key(event_id,news_id));
create table public.event_relations (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),from_event uuid references public.events on delete cascade,to_event uuid references public.events on delete cascade,relation_type text not null,check(from_event<>to_event));
create table public.custom_datasets (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),name text not null,source text,metadata jsonb default '{}');
create table public.price_bars (instrument_id text references public.instruments on delete cascade,session_date date,user_id uuid not null references auth.users(id),close numeric check(close>0),source text,dataset_id uuid references public.custom_datasets,primary key(user_id,instrument_id,session_date));
create table public.event_impacts (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),event_id uuid references public.events on delete cascade,instrument_id text references public.instruments,benchmark_id text references public.instruments,window_days int,aligned_date date,asset_return numeric,abnormal_return numeric,method_version text);
create table public.macro_indicators (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),name text,observation_date date,value numeric,unit text,source text);
create table public.user_notes (id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),event_id uuid references public.events on delete cascade,body text,updated_at timestamptz default now());
do $$ declare t text; begin foreach t in array array['instruments','events','news_articles','event_news','event_relations','custom_datasets','price_bars','event_impacts','macro_indicators','user_notes'] loop
execute format('alter table public.%I enable row level security',t);
execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',t);
execute format('revoke all on public.%I from anon',t);
execute format('grant select,insert,update,delete on public.%I to authenticated',t);
end loop; end $$;
commit;
-- A production server must additionally validate ownership of all referenced rows.
-- Local string demo IDs require UUID mapping on import. Schema not applied or DB-tested here.
