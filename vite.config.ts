import { defineConfig } from "vite";
import { resolve } from "path";
import fs from "fs";

// Custom plugin to copy and adjust extension files into dist root
function copyExtensionAssets() {
  return {
    name: "copy-extension-assets",
    closeBundle() {
      const dist = resolve(__dirname, "dist");
      if (!fs.existsSync(dist)) fs.mkdirSync(dist, { recursive: true });

      // Move popup.html from dist/src/popup/popup.html to dist/popup/popup.html
      const distSrcPopup = resolve(dist, "src/popup/popup.html");
      const distPopup = resolve(dist, "popup/popup.html");
      if (fs.existsSync(distSrcPopup)) {
        let content = fs.readFileSync(distSrcPopup, "utf-8");
        // replace paths so they resolve properly from inside dist/popup/
        content = content.replace(/src="(\.\.\/)*popup\/popup\.js"/g, 'src="./popup.js"');
        content = content.replace(/href="(\.\.\/)*popup\/popup\.css"/g, 'href="./popup.css"');
        content = content.replace(/href="(\.\.\/)*chunks\//g, 'href="../chunks/');
        fs.writeFileSync(distPopup, content, "utf-8");
      }

      // Move options.html from dist/src/options/options.html to dist/options/options.html
      const distSrcOptions = resolve(dist, "src/options/options.html");
      const distOptions = resolve(dist, "options/options.html");
      if (fs.existsSync(distSrcOptions)) {
        let content = fs.readFileSync(distSrcOptions, "utf-8");
        content = content.replace(/src="(\.\.\/)*options\/options\.js"/g, 'src="./options.js"');
        content = content.replace(/href="(\.\.\/)*options\/options\.css"/g, 'href="./options.css"');
        content = content.replace(/href="(\.\.\/)*chunks\//g, 'href="../chunks/');
        fs.writeFileSync(distOptions, content, "utf-8");
      }

      // Copy manifest.json
      if (fs.existsSync(resolve(__dirname, "manifest.json"))) {
        const manifest = JSON.parse(fs.readFileSync(resolve(__dirname, "manifest.json"), "utf-8"));
        manifest.action.default_popup = "popup/popup.html";
        manifest.options_ui.page = "options/options.html";
        fs.writeFileSync(resolve(dist, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
      }

      // Copy rules
      const rulesDir = resolve(dist, "rules");
      if (!fs.existsSync(rulesDir)) fs.mkdirSync(rulesDir, { recursive: true });
      const srcRulesDir = resolve(__dirname, "src/rules");
      if (fs.existsSync(srcRulesDir)) {
        for (const file of fs.readdirSync(srcRulesDir)) {
          if (file.endsWith(".json")) {
            fs.copyFileSync(resolve(srcRulesDir, file), resolve(rulesDir, file));
          }
        }
      }

      // Copy assets
      const assetsDir = resolve(dist, "assets");
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
      const srcAssetsDir = resolve(__dirname, "assets");
      if (fs.existsSync(srcAssetsDir)) {
        fs.cpSync(srcAssetsDir, assetsDir, { recursive: true });
      }

      // Clean up dist/src directory
      if (fs.existsSync(resolve(dist, "src"))) {
        fs.rmSync(resolve(dist, "src"), { recursive: true, force: true });
      }
    }
  };
}

export default defineConfig(({ mode }) => {
  const isContentBuild = mode === "content";

  if (isContentBuild) {
    return {
      resolve: {
        alias: {
          "@": resolve(__dirname, "src")
        }
      },
      build: {
        outDir: "dist",
        emptyOutDir: false,
        sourcemap: false,
        lib: {
          entry: resolve(__dirname, "src/content/content.ts"),
          name: "YTShieldContent",
          formats: ["iife"],
          fileName: () => "content/content.js"
        }
      }
    };
  }

  return {
    base: "./",
    plugins: [copyExtensionAssets()],
    resolve: {
      alias: {
        "@": resolve(__dirname, "src")
      }
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "src/popup/popup.html"),
          options: resolve(__dirname, "src/options/options.html"),
          "service-worker": resolve(__dirname, "src/background/service-worker.ts")
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === "service-worker") {
              return "background/service-worker.js";
            }
            return "[name]/[name].js";
          },
          chunkFileNames: "chunks/[name]-[hash].js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith(".css")) {
              return "[name]/[name].css";
            }
            return "assets/[name]-[hash][extname]";
          }
        }
      }
    },
    test: {
      globals: true,
      environment: "node"
    }
  };
});
