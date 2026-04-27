alter table public.bookings
  alter column status set default 'approved';

alter table public.bookings
  drop constraint if exists booking_status_check;

alter table public.bookings
  add constraint booking_status_check
  check (
    status in (
      'approved',
      'pending',
      'confirmed',
      'cancelled',
      'rejected',
      'ongoing',
      'completed'
    )
  );
