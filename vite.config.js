import { defineConfig } from 'vite'

const routes = {
  '/program':      '/program/index.html',
  // '/registrering': '/registrering/index.html',
  '/confirmation': '/confirmation/index.html',
  '/sted':         '/sted/index.html',
}

export default defineConfig({
  plugins: [
    {
      name: 'clean-urls',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (routes[req.url]) {
            req.url = routes[req.url]
          }
          next()
        })
      },
    },
  ],
})
