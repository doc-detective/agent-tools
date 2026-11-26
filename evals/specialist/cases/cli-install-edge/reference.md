You can't. Doc Detective doesn't run tests in Edge. `install browsers` takes only `chrome`, `firefox`, `chromedriver`, and `geckodriver`, and in version 5 a spec or context that names `edge` as its browser is invalid. Version 4 quietly opened Chrome for it. Use Chrome, which is also the default browser.

Install into the cache, and point every later run at the same cache:

```dockerfile
RUN npx doc-detective install all --cache-dir /opt/dd-cache --yes
ENV DOC_DETECTIVE_CACHE_DIR=/opt/dd-cache
```

`install all` adds the runtime packages and the browsers. For the browser alone, use `npx doc-detective install browsers chrome --cache-dir /opt/dd-cache --yes`. Pin the same Doc Detective version in the image and in the run, because each release pins its own runtime packages.

`install` and test runs read the cache location the same way. The first one set wins, in this order: `--cache-dir`, then `DOC_DETECTIVE_CACHE_DIR`, then `cacheDir` in the project config, then `cacheDir` in your user config. Without any of them, a run looks in the default cache, `$XDG_CACHE_HOME/doc-detective` or `~/.cache/doc-detective`, and downloads Chrome again. Run `npx doc-detective install status` in the container to check what the cache holds.
