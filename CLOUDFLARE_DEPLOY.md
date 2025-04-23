# Otimizações para Deploy no Cloudflare Pages

Este documento descreve as otimizações implementadas para melhorar o processo de build e deploy no Cloudflare Pages, especialmente para resolver problemas de memória durante o build.

## Problema

O Cloudflare Pages tem limites de memória durante o processo de build, o que pode causar erros como:

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
node::OOMErrorHandler(char const*, v8::OOMDetails const&) [node]
v8::internal::V8::FatalProcessOutOfMemory
```

Estes erros ocorrem quando o Node.js consome mais memória do que está disponível durante o processo de build.

## Soluções Implementadas

### 1. Otimização do Vite Config

O arquivo `vite.config.ts` foi otimizado para:

- Usar `esbuild` em vez de `terser` para minificação (menos intensivo em memória)
- Desativar source maps em produção
- Implementar uma estratégia de chunking mais eficiente
- Otimizar o tree-shaking para reduzir o uso de memória
- Limitar o tamanho dos assets inline
- Excluir dependências grandes da otimização
- Suporte para build dividido (split build)

### 2. Otimização do UnoCSS

O arquivo `uno.config.ts` foi otimizado para:

- Carregar apenas ícones essenciais
- Reduzir o número de classes geradas
- Implementar carregamento lazy para ícones

### 3. Scripts de Otimização de Build

Foram criados dois scripts para otimizar o processo de build:

#### `scripts/optimize-build.js`
- Limpa diretórios temporários antes do build
- Define variáveis de ambiente para otimizar o uso de memória
- Executa o build com limites de memória aumentados (8GB)

#### `scripts/split-build.js` (Novo)
- Divide o processo de build em etapas menores
- Constrói o cliente e o servidor separadamente
- Usa configurações mínimas para cada etapa
- Reduz drasticamente o uso de memória

### 4. Configuração do Wrangler

O arquivo `wrangler.toml` foi atualizado para:

- Aumentar o limite de memória durante o build para 8GB
- Usar o script de build dividido
- Definir variáveis de ambiente para otimização
- Otimizar o processo de deploy

## Como Usar

### Build Local Otimizado

Para executar um build otimizado localmente:

```bash
pnpm run build:optimized
```

Este comando executará o script de otimização que limpa caches, configura variáveis de ambiente e executa o build com configurações otimizadas.

### Build Dividido (Recomendado para Cloudflare)

Para executar o build dividido em etapas (menor uso de memória):

```bash
pnpm run build:split
```

Este comando divide o processo de build em etapas menores, reduzindo drasticamente o uso de memória.

### Opções de Deploy

#### 1. Deploy Padrão para Cloudflare Pages

Para fazer deploy para o Cloudflare Pages usando o método padrão:

```bash
pnpm run deploy
```

Este comando executará o build dividido e depois fará o deploy para o Cloudflare Pages.

#### 2. Deploy Direto (Recomendado para projetos grandes)

Para fazer deploy usando a API de Direct Upload do Cloudflare Pages:

```bash
CLOUDFLARE_API_TOKEN=seu_token CLOUDFLARE_ACCOUNT_ID=seu_account_id PROJECT_NAME=nome_do_projeto pnpm run deploy:direct
```

Este método:
- Faz o build localmente
- Faz upload dos arquivos diretamente para o Cloudflare
- Evita completamente o processo de build do Cloudflare
- Requer um token de API do Cloudflare com permissões para Pages

#### 3. Deploy via GitHub Actions

Para fazer deploy usando GitHub Actions:

1. Configure os secrets no seu repositório GitHub:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

2. Faça push para o branch main:

```bash
git push origin main
```

O workflow do GitHub Actions irá:
- Fazer o build em uma máquina com mais recursos
- Fazer o deploy para o Cloudflare Pages
- Mostrar o status do deploy nos Actions do GitHub

## Solução de Problemas

Se você ainda encontrar problemas de memória durante o build:

1. **Verifique se está usando o build dividido**: O comando `pnpm run build:split` é o mais eficiente em termos de memória.

2. **Aumente o limite de memória**: Edite os arquivos `scripts/optimize-build.js` e `scripts/split-build.js` e aumente o valor de `NODE_MEMORY` (por exemplo, para 12288 ou 16384 MB).

3. **Reduza o tamanho do bundle**: Considere remover temporariamente algumas funcionalidades ou dependências grandes para o deploy.

4. **Use a opção de build manual do Cloudflare Pages**: 
   - Execute o build localmente com `pnpm run build:split`
   - Configure o Cloudflare Pages para usar o diretório `build/client` como diretório de saída
   - Faça upload manual dos arquivos gerados

5. **Considere usar GitHub Actions para o build**:
   - Configure um workflow do GitHub Actions para executar o build
   - Faça o deploy dos arquivos gerados para o Cloudflare Pages
   - Isso permite usar máquinas com mais memória para o build

## Referências

- [Documentação do Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Guia de Otimização do Vite](https://vitejs.dev/guide/performance.html)
- [Troubleshooting Memory Issues in Node.js](https://nodejs.org/en/docs/guides/debugging-getting-started/)
- [Direct Upload API do Cloudflare Pages](https://developers.cloudflare.com/pages/platform/direct-upload/)
