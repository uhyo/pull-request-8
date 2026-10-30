import { defineConfig } from "vite";

export default defineConfig({
  // 相対パスで出力して、GitHub Pages などのサブパスでも動くようにする
  base: "./",
});
