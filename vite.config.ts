import {defineConfig} from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({base:process.env.ATLAS_BASE||'/',plugins:[tailwindcss()],server:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:true}}},preview:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:8787',changeOrigin:true}}}});
