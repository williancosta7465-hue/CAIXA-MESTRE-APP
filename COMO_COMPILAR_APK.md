# Como Compilar APK do Caixa Mestre

## Pré-requisitos
- Node.js instalado
- Android Studio instalado
- Java JDK 17 ou superior

## Passos para Compilar o APK

### 1. Instalar dependências do Capacitor
Execute no terminal (PowerShell como Administrador):

```powershell
# Habilitar execução de scripts temporariamente
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# Instalar dependências
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2. Inicializar o Capacitor
```powershell
npx cap init
```

### 3. Adicionar plataforma Android
```powershell
npx cap add android
```

### 4. Build do projeto
```powershell
npm run build
```

### 5. Sincronizar com Capacitor
```powershell
npx cap sync android
```

### 6. Abrir projeto no Android Studio
```powershell
npx cap open android
```

### 7. Gerar APK no Android Studio
1. No Android Studio, clique em **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**
2. O APK será gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`

## Alternativa: Usar apenas o PWA
Como este é um PWA, você pode:
1. Executar `npm run build`
2. Hospedar a pasta `dist` em qualquer servidor web
3. Instalar o PWA diretamente no navegador (Chrome/Edge) no Android
