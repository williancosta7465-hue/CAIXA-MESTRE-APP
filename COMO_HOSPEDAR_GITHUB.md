# Como Hospedar no GitHub Pages (Grátis)

## Passo 1: Build do projeto
Execute no terminal na pasta do projeto:
```powershell
npm run build
```
Isso vai criar a pasta `dist` com todos os arquivos prontos.

## Passo 2: Criar repositório no GitHub

1. Acesse https://github.com
2. Faça login (ou crie uma conta gratuita)
3. Clique no **+** no canto superior direito
4. Selecione **"New repository"**
5. Configure:
   - Repository name: `caixa-mestre-pwa` (ou outro nome)
   - Public: ✅ Marque como **Public**
   - Add README: ❌ Não marque
   - Add .gitignore: ❌ Não marque
6. Clique em **"Create repository"**

## Passo 3: Instalar Git (se não tiver)

Verifique se tem Git instalado:
```powershell
git --version
```

Se não tiver, baixe em: https://git-scm.com/download/win

## Passo 4: Configurar Git (primeira vez)

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seuemail@exemplo.com"
```

## Passo 5: Preparar o projeto para GitHub

No terminal, na pasta do projeto:

```powershell
# Inicializar Git
git init

# Adicionar todos os arquivos
git add .

# Commit inicial
git commit -m "Commit inicial"

# Renomear branch para main
git branch -M main
```

## Passo 6: Conectar ao GitHub

No GitHub, após criar o repositório, copie o comando que aparece:
```
git remote add origin https://github.com/SEU_USUARIO/caixa-mestre-pwa.git
```

Execute no terminal (substitua SEU_USUARIO pelo seu usuário do GitHub):
```powershell
git remote add origin https://github.com/SEU_USUARIO/caixa-mestre-pwa.git
```

## Passo 7: Enviar para GitHub

```powershell
git push -u origin main
```

## Passo 8: Ativar GitHub Pages

1. No GitHub, entre no seu repositório
2. Clique em **Settings** (engrenagem)
3. No menu lateral, clique em **Pages**
4. Em **Build and deployment** > **Source**, selecione:
   - Branch: `main`
   - Folder: `/ (root)`
5. Clique em **Save**

## Passo 9: Aguardar deploy

- GitHub vai fazer o deploy automaticamente
- Aguarde 1-2 minutos
- Aparecerá uma URL verde, exemplo:
  `https://seuusuario.github.io/caixa-mestre-pwa/`

## Passo 10: Acessar no celular

1. Abra a URL no navegador do celular
2. No Chrome/Edge, clique no menu (3 pontos)
3. Selecione **"Instalar aplicativo"**
4. Confirme

## Passo 11: Atualizar o projeto (quando fizer mudanças)

```powershell
# Build
npm run build

# Adicionar mudanças
git add .

# Commit
git commit -m "Descrição da mudança"

# Enviar
git push
```

GitHub Pages atualiza automaticamente após o push.

## Solução de problemas

**Erro 404:**
- Verifique se o repositório é **Public**
- Aguarde 2-3 minutos após o push

**Build falhou:**
- Verifique se a pasta `dist` existe
- Execute `npm run build` novamente
- Verifique o log em Actions no GitHub

**Site não atualiza:**
- Limpe o cache do navegador
- Aguarde mais tempo (GitHub Pages pode demorar)
