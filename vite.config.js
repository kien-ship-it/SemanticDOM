import { defineConfig } from 'vite';

export default defineConfig({
    root: 'output',
    server: {
        open: true
    },
    test: {
        root: '.'
    }
});
