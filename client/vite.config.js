import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173
    },
    css: {
        preprocessorOptions: {
            scss: {
                // O Bootstrap ainda usa @import + funções antigas do Sass.
                // Isso é aviso de versão futura (Dart Sass 3), não afeta nada hoje.
                silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions']
            }
        }
    }
});
