import { defineConfig } from 'vite';

export default defineConfig({
  base: '/notbackyardbaseball/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
