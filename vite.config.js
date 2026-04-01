import { defineConfig } from 'vite'

const routes = {
  '/program':      '/src/program/program.html',
  // '/registrering': '/src/registrering/registrering.html',
  '/confirmation': '/src/confirmation/confirmation.html',
  '/sted':         '/src/sted/sted.html',
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
