-- Historical rows remain unchanged and retain their existing viewer behavior.
-- New uploads are marked only after their rebuilt Drive copy is stored.
alter table public.request_documents add column is_rebuilt boolean not null default false;
