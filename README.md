# 🖼️ Projeto de Imagens Dinâmicas

![alt text](logo.png)

Sistema full stack para **geração e composição de imagens dinâmicas**, com backend em Node.js e frontend em React (Vite).  
Permite combinar imagens base, overlays, textos e estilos via API.

---

## ✅ Pré-requisitos

- Node.js **18+** (recomendado):

Acesse o site oficial:
👉 https://nodejs.org

Baixe a versão LTS (recomendada)

Certifique-se que é 18 ou superior (hoje normalmente já é 20+)

Execute o instalador .msi

Durante a instalação:
Clique em Next até o final

Mantenha todas as opções padrão

Importante: deixe marcado “Add to PATH”

Finalize a instalação

- Git:

Acesse:
👉 https://git-scm.com

Clique em Download for Windows

Execute o instalador

Durante a instalação:
Pode deixar tudo padrão

Quando aparecer:
“Choosing the default editor” → pode deixar Vim ou escolher VS Code (se tiver)

“Adjusting your PATH” → deixe Git from the command line

Finalize

---

## 🚀 Passo a passo para rodar o projeto

1️⃣ Clonar o repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd <PASTA_DO_PROJETO>

2️⃣ Instalar dependências

npm run install:all

3️⃣ Configurar variáveis de ambiente (.env)

Rode no terminal:

node backend/setup-env.js

siga o passo a passo


4️⃣ Gerar acessos iniciais (usuário/admin)

Antes de rodar o sistema pela primeira vez, é necessário gerar os acessos iniciais.

Rode no terminal:

node backend/setup.js

siga o passo a passo

5️⃣ Iniciar backend e frontend:

npm run dev:all
```

<img width="1524" height="840" alt="Captura de tela 2026-04-01 123755" src="https://github.com/user-attachments/assets/ab209cf4-a8ba-40a5-bd70-3e22d4107397" />

No caso de erro 403 verificar se essa opção está desativada na cloudflare:



Ela impede o funcionamento normal das requisições
