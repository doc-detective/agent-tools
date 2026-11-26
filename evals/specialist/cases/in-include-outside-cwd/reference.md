Doc Detective only includes files inside the working directory, after symbolic links resolve. You ran it from `src/tutorials`, and `src/snippets/login.md` is one level up, so the include doesn't resolve. A broken include only warns: the directive stays in the page as text, the chapters end up with no tests, and the run exits `2` because nothing was tested.

Run Doc Detective from a folder that contains both files, such as the book's root, and point `--input` at the chapters:

```bash
cd /home/me/book
npx doc-detective --input src/tutorials
```

Doc Detective then replaces each `{{#include}}` with the snippet's content before it looks for tests. The login test runs once inside each page that includes it, so twice: once in `a.md` and once in `b.md`. `login.md` doesn't run on its own as a separate spec, even when an `--input` folder contains it, because it's a partial. To run it alone, name it as the only input: `npx doc-detective --input src/snippets/login.md`.
