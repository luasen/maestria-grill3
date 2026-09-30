# Maestria Grill - Guia de Implantação (Hostinger via GitHub Actions)

Este projeto está totalmente configurado e otimizado para ser implantado na **Hostinger** automaticamente sempre que você enviar alterações para o seu repositório no **GitHub**.

## 🚀 Como funciona a implantação automática?

Configuramos um fluxo do **GitHub Actions** (`.github/workflows/deploy.yml`) que automatiza todo o processo:
1. Detecta quando você faz um `git push` nas ramificações `main` ou `master`.
2. Instala as dependências do projeto e executa o build de produção (`npm run build`).
3. Envia os arquivos gerados (da pasta `dist/`) diretamente para a pasta `/public_html` da sua Hostinger usando protocolo **FTP**.

---

## 🛠️ Passo a Passo para Configurar a Implantação

Siga os passos abaixo para ativar a automação no seu GitHub:

### Passo 1: Pegar as credenciais FTP na Hostinger
1. Faça login no painel da **Hostinger**.
2. Vá em **Sites** > Selecione o seu domínio `sheikcoin.site`.
3. No menu lateral esquerdo, procure por **Arquivos** > **Contas FTP**.
4. Anote as seguintes informações:
   - **Host de FTP** (ex: `ftp.sheikcoin.site` ou um IP).
   - **Usuário de FTP**.
   - **Senha de FTP** (caso não saiba, você pode redefinir a senha ali mesmo).

### Passo 2: Configurar os Segredos (Secrets) no GitHub
Para que o GitHub possa enviar os arquivos de forma segura, você deve cadastrar as credenciais do FTP como segredos do seu repositório:
1. Abra o repositório do seu projeto no **GitHub**.
2. Clique na aba **Settings** (Configurações) no topo.
3. No menu lateral esquerdo, vá em **Secrets and variables** > **Actions**.
4. Clique no botão verde **New repository secret** no canto superior direito.
5. Adicione três segredos com os seguintes nomes exatos:
   - **`FTP_SERVER`**: Cole o Host de FTP (ex: `ftp.sheikcoin.site`).
   - **`FTP_USERNAME`**: Cole o Usuário de FTP.
   - **`FTP_PASSWORD`**: Cole a Senha de FTP.

*Pronto! No próximo `git push` na branch `main`, a implantação será feita de forma 100% automática.*

---

## 🔒 Configuração Crucial no Firebase

Como seu site agora responderá no domínio `https://sheikcoin.site/`, você **precisa autorizar esse domínio no Firebase** para que o login e a autenticação funcionem perfeitamente.

1. Acesse o **[Firebase Console](https://console.firebase.google.com/)**.
2. Selecione o projeto **maestriagrill**.
3. No menu lateral, clique em **Build** > **Authentication** (Autenticação).
4. Clique na aba **Settings** (Configurações) no topo.
5. No menu esquerdo, selecione **Authorized domains** (Domínios autorizados).
6. Clique em **Add domain** (Adicionar domínio) e insira:
   - `sheikcoin.site`
   - `www.sheikcoin.site`
7. Clique em **Salvar**.

---

## 📁 Otimizações já inclusas no projeto

* **`.htaccess` (Vite SPA Routing):** Criamos o arquivo `public/.htaccess`. Ele é copiado automaticamente para a raiz da Hostinger no build. Isso garante que rotas secundárias (como `sheikcoin.site/menu`, `/checkout` ou `/my-orders`) funcionem perfeitamente ao recarregar a página, evitando o erro 404 comum de servidores Apache.
* **Firebase Config:** Atualizado para o seu novo ID de projeto Firebase (`maestriagrill`).
