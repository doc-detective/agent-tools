# Widget docs site

A static HTML site in `public/`. The how-to guides in `docs/` are tested against it with [Doc Detective](https://doc-detective.com).

To preview the site, serve it on http://localhost:8000:

```bash
python3 -m http.server 8000 --directory public
```

The doc tests need it running.
