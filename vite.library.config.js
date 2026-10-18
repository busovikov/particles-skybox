import {defineConfig} from 'vite';
export default defineConfig({build:{lib:{entry:'src/index.js',formats:['es'],fileName:()=> 'particles-skybox.js'},rollupOptions:{external:id=>id==='three'||id.startsWith('three/')}}});
