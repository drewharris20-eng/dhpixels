# 1234weddings.com Client Gallery Starter

This is a plain HTML/CSS/JS wedding photo delivery system for Netlify + Supabase.

## Files
- `index.html` - simple landing page
- `admin.html` - admin login and photo upload page
- `gallery.html` - client gallery page
- `delivery.css` - shared styling
- `supabase-config.js` - paste your Supabase URL and anon key here
- `admin.js` - upload logic
- `gallery.js` - gallery, favorites, download logic

## Supabase setup
1. Create a Supabase project.
2. Go to Storage.
3. Create a bucket named: `wedding-galleries`
4. Make the bucket public.
5. Go to Project Settings → API.
6. Copy your Project URL and anon public key.
7. Paste both into `supabase-config.js`.

## Supabase Auth
1. Go to Authentication → Users.
2. Create your admin user.
3. In Authentication settings, disable public signups if you want only yourself to upload.

## Storage policies
Run these in Supabase SQL Editor:

```sql
create policy "Public can view wedding gallery photos"
on storage.objects
for select
to public
using (bucket_id = 'wedding-galleries');

create policy "Logged in admin can upload wedding gallery photos"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'wedding-galleries');

create policy "Logged in admin can update wedding gallery photos"
on storage.objects
for update
to authenticated
using (bucket_id = 'wedding-galleries')
with check (bucket_id = 'wedding-galleries');

create policy "Logged in admin can delete wedding gallery photos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'wedding-galleries');
```

## How to use
1. Open `/admin.html`
2. Log in with your Supabase admin email/password.
3. Enter a gallery slug like `sarah-jake`.
4. Upload one headline/banner photo.
5. Upload the gallery photos.
6. Send your client this link:

`https://1234weddings.com/gallery.html?gallery=sarah-jake`


## Banner photo
Each gallery can have one headline photo above the gallery.

In the admin page, upload the banner photo first.
It is stored inside the gallery folder as `_banner.jpg`, `_banner.png`, etc.

Example:
- `sarah-jake/_banner.jpg`
- `sarah-jake/photo-001.jpg`
- `sarah-jake/photo-002.jpg`

The gallery automatically hides `_banner` from the photo grid and uses it as the hero image.
