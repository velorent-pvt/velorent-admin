drop table if exists notifications;

create table notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references auth.users(id) on delete cascade,

  type text not null,
  title text not null,
  message text not null,

  link text,     
  deeplink text,  

  is_read boolean default false,

  created_at timestamptz default now(),
  read_at timestamptz
);


CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);

CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id, created_at DESC) 
WHERE is_read = false;