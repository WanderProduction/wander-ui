import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

/**
 * A LIBRARY BUILD, AND IT IS NOT OPTIONAL.
 *
 * Vite does not transpile anything inside `node_modules`, so a package that
 * ships raw `.jsx` is a package every consumer has to teach its bundler
 * about — and the error when they have not is a parse failure pointing at our
 * file, which reads as a broken library. So the JSX is compiled here, once.
 *
 * `prepare` runs this on install, which is what makes `npm i github:…#v0.1.0`
 * work with nothing committed to `dist/`: npm clones the tag, runs `prepare`,
 * and the consumer gets built files. The alternative — committing `dist/` —
 * puts a build artefact in every diff and lets the source and the build
 * disagree in a tagged release.
 */
export default defineConfig({
  /* TAILWIND IS FOR THE HARNESS, NOT FOR THE LIBRARY BUILD.

     The components are written with Tailwind utility classes, which the
     CONSUMER compiles — that is what `peerDependencies` would say if npm had a
     way to say "and a CSS framework". Nothing is emitted into `dist`: the
     plugin is here so `npm run dev` shows what a consumer sees rather than the
     browser's default button chrome, which is what the first harness showed
     and what sent this paragraph into the README. */
  plugins: [react(), tailwind()],
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['es'],
      fileName: () => 'wander-ui.js',
    },
    rollupOptions: {
      /*
        PEERS, NOT DEPENDENCIES. Two copies of React in one page is the error
        everybody has met ("invalid hook call"), and two copies of lucide is
        1,767 icons shipped twice. The consumer already has all three, and
        `peerDependencies` is what says so.

        `lucide-react/icons/…` IS NOT MATCHED by the bare name, which is why
        this is a predicate rather than a list: a deep import of one icon
        would otherwise be bundled while the main entry stayed external.
      */
      external: (id) => /^(react|react-dom|lucide-react)(\/|$)/.test(id),
    },
    /* The consumer minifies. Minifying here only makes the stack traces they
       see on our code unreadable. */
    minify: false,
    sourcemap: true,
  },
})
