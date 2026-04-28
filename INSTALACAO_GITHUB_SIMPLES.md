# Hospedar no GitHub - Passo a Passo Simples

## 1. Acessar GitHub
Entre em: https://github.com
- Faça login ou crie conta (grátis)
- Clique no **+** (canto superior direito)
- Clique em **"New repository"**

## 2. Criar Repositório
- Repository name: `caixa-mestre-pwa`
- Marque **Public** ✅
- Clique em **"Create repository"**

## 3. Copiar o comando do GitHub
Após criar, vai aparecer um comando como:
```
git remote add origin https://github.com/SEU_USUARIO/caixa-mestre-pwa.git
```
**Copie esse comando** (vai usar depois)

## 4. Configurar Git (só primeira vez)
Abra o PowerShell e execute:
```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seuemail@gmail.com"
```

## 5. Enviar arquivos para GitHub
No PowerShell, na pasta do projeto, execute estes comandos em ordem:

```powershell
git init
git add .
git commit -m "primeiro commit"
git branch -M main
```

Agora cole o comando que copiou do GitHub (Passo 3):
```powershell
git remote add origin https://github.com/SEU_USUARIO/caixa-mestre-pwa.git
```

Depois:
```powershell
git push -u origin main
```

## 6. Ativar GitHub Pages
- No GitHub, clique em **Settings** (engrenagem)
- Clique em **Pages** (menu lateral)
- Em **Source**, selecione:
  - Branch: `main`
  - Folder: `/ (root)`
- Clique em **Save**

## 7. Aguardar
Aguarde 1-2 minutos
Vai aparecer uma URL verde, exemplo:
`https://seuusuario.github.io/caixa-mestre-pwa/`

## 8. Usar no celular
- Abra essa URL no celular
- Chrome menu → "Instalar aplicativo"
- Pronto!

## Para atualizar depois:
```powershell
npm run build
git add .
git commit -m "atualizacao"
git push
```
