# Clean Git — Bulk Repository Manager

Extensão para Google Chrome (Manifest V3) que unifica, numa única interface, ações de gestão de repositórios que normalmente estão espalhadas pelo GitHub: listar, filtrar, baixar, tornar público/privado e apagar repositórios em massa.

O projeto é e sempre será gratuito para o usuário final. Não há SDK de terceiros, telemetria ou coleta de dados — veja [Privacidade e monetização](#privacidade-e-monetização).

## Como funciona

Não é uma extensão de content script que mexe no DOM do github.com. Ela fala direto com a **GitHub REST API** usando um **Personal Access Token (PAT)** que o próprio usuário gera e cola na extensão. O token fica salvo só em `chrome.storage.local` (local ao navegador do usuário) e nunca é enviado a nenhum servidor além de `api.github.com`.

Fluxo de telas:

1. **Popup** (`src/popup`) — ícone da extensão na barra do Chrome. Mostra se já existe um token salvo e abre a tela certa (Connect ou Dashboard) numa nova aba.
2. **Connect** (`src/connect`) — formulário para colar o PAT. Valida o token contra `GET /user` antes de salvar; se falhar, distingue token inválido, sem permissão e erro de rede.
3. **Dashboard** (`src/dashboard`) — página principal: métricas gerais, tabela de repositórios (busca, filtros de visibilidade/linguagem, ordenação, paginação), gráfico de distribuição por linguagem e ações em massa sobre os repositórios selecionados (baixar, tornar privado, tornar público, apagar).

## Estrutura de pastas

```
src/
  background/service-worker.js   service worker do Manifest V3 (mínimo, só log de instalação)
  popup/                         tela do popup (React)
  connect/                       tela de conexão do token (React)
  dashboard/                     tela principal (React)
  shared/
    github-api.js                todas as chamadas à GitHub REST API + tratamento de erro (GitHubApiError)
    storage.js                   ler/gravar/limpar o token em chrome.storage.local
    theme.js                     tokens de design (cores, raios, fontes) compartilhados entre as telas
    format.js                    formatação de tamanho de arquivo (KB/MB/GB)
    donationLinks.js             links de doação (GitHub Sponsors / Buy Me a Coffee)
    SupportLinks.jsx             componente que renderiza os links de doação
public/icons/                    ícones da extensão (16/48/128px)
tests/                           testes automatizados (Vitest + Testing Library)
manifest.config.js               manifesto do Chrome (Manifest V3), gerado via @crxjs/vite-plugin
vite.config.js                   configuração do build (multi-entrada: popup/connect/dashboard)
```

## Stack técnica

- **React 19 + Vite** para as três telas (popup/connect/dashboard) — compilado para JS/HTML/CSS puro no build; a extensão em si não depende de React em tempo de execução.
- **@crxjs/vite-plugin** gera o `manifest.json` final a partir de `manifest.config.js` e cuida do empacotamento específico de extensão Chrome (service worker, múltiplas páginas HTML).
- **Sem dependências de backend** — toda a lógica roda no navegador do usuário, autenticada com o PAT dele.

## Rodando localmente

Pré-requisito: Node.js instalado.

```bash
npm install       # instala as dependências
npm run dev       # sobe o Vite em modo desenvolvimento (hot reload)
npm run build     # gera a build de produção em dist/
npm test          # roda os testes automatizados uma vez
npm run test:watch  # roda os testes de novo a cada arquivo salvo
```

## Testes automatizados

Os testes ficam em `tests/` e rodam com **Vitest** num navegador simulado (jsdom). Nenhum teste fala com o GitHub.com de verdade: o `fetch` e as APIs `chrome.*` são substituídos por versões falsas em memória (`tests/setup.js` e `tests/helpers.js`).

O que é coberto:

- `shared/` — formatação de tamanho, leitura/gravação do token, chamadas à API (headers, paginação, erros 401/403/rede, rate limit).
- **Popup** — abre Connect ou Dashboard conforme exista token salvo.
- **Connect** — valida o token antes de salvar e mostra a mensagem de erro certa.
- **Dashboard** — carregamento e erros, busca/filtros/ordenação, e as travas de segurança das ações em massa (digitar `DELETE`/`PUBLIC`, só alterar os repositórios certos).

## Carregando a extensão no Chrome (modo desenvolvedor)

1. Rode `npm run build` — isso gera a pasta `dist/`.
2. Abra `chrome://extensions` no Chrome.
3. Ative o **Modo do desenvolvedor** (canto superior direito).
4. Clique em **Carregar sem compactação** e selecione a pasta `dist/`.

Isso instala a extensão só localmente, no seu navegador — não é o mesmo que publicá-la na Chrome Web Store (isso é um processo à parte, ainda não feito).

## Token do GitHub (PAT)

A extensão exige um Personal Access Token com os escopos:

- `repo` — ler/gerenciar repositórios
- `delete_repo` — necessário para a ação de apagar repositórios em massa

O token é validado contra a API antes de ser salvo e pode ser gerado diretamente pelo link exibido na tela de Connect.

## Privacidade e monetização

- Nenhum dado do usuário sai da máquina dele além das chamadas diretas à `api.github.com`.
- Monetização é só por doação voluntária (GitHub Sponsors / Buy Me a Coffee / Pix) — sem SDK de bandwidth, sem anúncios, sem paywall. Essa decisão foi deliberada: o público-alvo concede um token com escopo `delete_repo`, então qualquer integração de terceiros que não seja estritamente necessária é vista como quebra de confiança desproporcional ao ganho.

## Status do projeto

Funcional: conexão via PAT, listagem/filtro/ordenação/paginação de repositórios, download, tornar público/privado com confirmação, exclusão em massa com confirmação reforçada (digitar `DELETE`), desconectar conta. Testes automatizados cobrindo os módulos compartilhados e as três telas.

Pendente: publicação na Chrome Web Store, chave Pix configurada, link do Buy Me a Coffee configurado.
