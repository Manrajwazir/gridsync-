-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- This sets up the real-time alert system for GridSync

-- 1. Create the alerts table
create table if not exists public.alerts (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  message text not null,
  type text not null default 'warning', -- 'warning' or 'critical'
  is_active boolean default true
);

-- 2. Enable Realtime for this table
-- This allows consumers to see alerts the instant a row is inserted
alter publication supabase_realtime add table alerts;

-- 3. (Optional) Set up RLS policies if you want to restrict inserts 
-- For the hackathon, you can just keep it open for quick demo if needed, 
-- but normally you'd restrict 'insert' to operators only.
alter table public.alerts enable row level security;

create policy "Anyone can read active alerts" 
  on public.alerts for select 
  using (true);

create policy "Authenticated users can insert alerts" 
  on public.alerts for insert 
  with check (auth.role() = 'authenticated');
