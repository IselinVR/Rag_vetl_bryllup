import { defineConfig } from 'vite'

const routes = {
  '/program':      '/program/index.html',
  // '/registrering': '/registrering/index.html',
  '/confirmation': '/confirmation/index.html',
  '/sted':         '/sted/index.html',
  '/bilder':       '/bilder/index.html',
  '/qr':           '/qr/index.html',
}

export default defineConfig({
  plugins: [
    {
      name: 'clean-urls',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const [path, query] = req.url.split('?')
          if (routes[path]) {
            req.url = routes[path] + (query ? '?' + query : '')
          }
          next()
        })
      },
    },
  ],
})
