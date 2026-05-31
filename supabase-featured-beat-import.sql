insert into public.beats (
  name,
  subtitle,
  bpm,
  key,
  duration,
  duration_seconds,
  preview_url,
  cover_url,
  price,
  tags,
  description,
  published,
  sort_order
)
select
  'SHADOW OF THE SP',
  'rare soul chop / SP-1200 drums',
  94,
  'F Min',
  '3:30',
  210,
  './audio/previews/ghost-of-good-times.mp3',
  './images/covers/shadow-of-the-sp.jpg',
  29.99,
  array['boom bap', 'soul', 'chopped', 'featured']::text[],
  'Authentic Boom Bap instrumentals built from rare samples, heavy drums, and classic sounds. Mixed with grit, space, and enough headroom for sharp verses.',
  true,
  0
where not exists (
  select 1
  from public.beats
  where lower(name) = lower('SHADOW OF THE SP')
);
