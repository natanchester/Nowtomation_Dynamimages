// backend/setup-env.js

const fs = require('fs');
const path = require('path');
const crypto = require("crypto");
const prompt = require("prompt-sync")({ sigint: true });

const ROOT_PATH = path.join(__dirname, "..");
const ENV_PATH = path.join(__dirname, ".env"); // backend/.env
const VITE_CONFIG_PATH = path.join(ROOT_PATH, "vite.config.ts");

// Token seguro
function generateToken(prefix) {
  return `${prefix}-${crypto.randomBytes(24).toString("hex")}`;
}

function createEnv({ domain, frontSub, backSub }) {
  const frontendUrl = domain
    ? `https://${frontSub}.${domain}`
    : "http://localhost:5173";

  const backendUrl = domain
    ? `https://${backSub}.${domain}`
    : "http://localhost:5173";

  const content = `
ADMIN_API_TOKEN=${generateToken("ntm-api")}
SESSION_SECRET=${generateToken("ntm-session")}
ADMIN_REGISTER_TOKEN=${generateToken("ntm-register")}
PORT=3000
FRONTEND_URL=${frontendUrl}
VITE_API_URL=${backendUrl}
`.trim();

  fs.writeFileSync(ENV_PATH, content);

  console.log("✅ .env do backend atualizado em:", ENV_PATH);
}

function updateViteConfig(domain) {
  if (!domain) return;

  if (!fs.existsSync(VITE_CONFIG_PATH)) {
    console.log("❌ vite.config.ts não encontrado");
    return;
  }

  let content = fs.readFileSync(VITE_CONFIG_PATH, "utf-8");

  const regex = /allowedHosts\s*:\s*\[[^\]]*\]/;
  const newValue = `allowedHosts: [".${domain}"]`;

  if (!regex.test(content)) {
    console.log("❌ allowedHosts não encontrado. Nenhuma alteração feita.");
    return;
  }

  content = content.replace(regex, newValue);

  fs.writeFileSync(VITE_CONFIG_PATH, content);

  console.log("✅ allowedHosts atualizado com sucesso!");
}

function updateServerJs(frontendUrl) {
  const fs = require("fs");
  const path = require("path");

  const SERVER_PATH = path.join(__dirname, "server.js");

  if (!fs.existsSync(SERVER_PATH)) {
    console.log("❌ server.js não encontrado");
    return;
  }

  let content = fs.readFileSync(SERVER_PATH, "utf-8");

  const regex = /process\.env\.FRONTEND_URL\s*\|\|\s*['"`][^'"`]*['"`]/;

  const newValue = `process.env.FRONTEND_URL || '${frontendUrl}'`;

  if (!regex.test(content)) {
    console.log("⚠️ fallback FRONTEND_URL não encontrado");
    return;
  }

  content = content.replace(regex, newValue);

  fs.writeFileSync(SERVER_PATH, content);

  console.log("✅ server.js atualizado (fallback corrigido)");
}

function updateApiTs(backendUrl) {
  const fs = require("fs");
  const path = require("path");

  const API_PATH = path.join(__dirname, "..", "src", "lib", "api.ts");

  if (!fs.existsSync(API_PATH)) {
    console.log("❌ api.ts não encontrado");
    return;
  }

  let content = fs.readFileSync(API_PATH, "utf-8");

  const regex = /import\.meta\.env\.VITE_API_URL\s*\|\|\s*['"`][^'"`]*['"`]/;

  const newValue = `import.meta.env.VITE_API_URL || '${backendUrl}'`;

  if (!regex.test(content)) {
    console.log("⚠️ fallback API_BASE não encontrado");
    return;
  }

  content = content.replace(regex, newValue);

  fs.writeFileSync(API_PATH, content);

  console.log("✅ api.ts atualizado (fallback corrigido)");
}

// Execução
function run() {
  console.clear();
  console.log("=== Setup automático ===\n");

  const useDomain = prompt("Usar domínio personalizado? (s/n): ").toLowerCase();

  let domain = null;
  let frontSub = null;
  let backSub = null;

  if (useDomain === "s") {
    domain = prompt("Domínio base (ex: natanchester.com.br): ")
      .replace(/^https?:\/\//, "")
      .trim();

    frontSub = prompt("Subdomínio FRONT (ex: front): ").trim();
    backSub = prompt("Subdomínio BACK (ex: back): ").trim();

    if (!domain || !frontSub || !backSub) {
      console.log("❌ Dados inválidos");
      return;
    }
  }

  const frontendUrl = domain
    ? `https://${frontSub}.${domain}`
    : "http://localhost:5173";

  const backendUrl = domain
    ? `https://${backSub}.${domain}`
    : "http://localhost:5173";

  createEnv({ domain, frontSub, backSub });

  //  novas funções
  updateViteConfig(domain);
  updateServerJs(frontendUrl);
  updateApiTs(backendUrl);

  createEnv({ domain, frontSub, backSub });
  updateViteConfig(domain);

  console.log("\n🚀 Setup concluído!");
}

run();