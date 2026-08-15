# Próximos passos para Releases

Este documento registra o trabalho necessário para publicar versões instaláveis do
Git Persona por meio das Releases do GitHub.

## Escopo inicial

Os primeiros formatos de distribuição serão:

- Ubuntu e distribuições compatíveis com Debian: pacote `.deb` para `amd64`.
- Windows: instalador NSIS `-setup.exe` para `x64`.

Snap e Flatpak não fazem parte do escopo. A distribuição para macOS fica adiada até
existir acesso a um ambiente adequado para compilação e testes. Não anunciar suporte
a macOS antes dessa validação.

## Estado atual

O frontend e o backend já podem ser compilados pelo Tauri, que também oferece suporte
aos formatos Debian e NSIS. Entretanto, os instaladores atuais ainda não devem ser
publicados porque existem dois bloqueios principais:

1. O executável `gitpersona-helper` não é incluído no bundle.
2. O Client ID do OAuth App não é incorporado corretamente à build de produção.

Também é necessário revisar como o aplicativo modifica configurações globais do Git
e do SSH antes de distribuí-lo para usuários finais.

## 1. Incorporar o GitHub OAuth Client ID

O código atual tenta ler `GITHUB_CLIENT_ID` em tempo de execução e usa
`YOUR_GITHUB_CLIENT_ID_HERE` como fallback. O `.env` é carregado pelo script de
desenvolvimento, mas não estará presente no computador de quem instalar o programa.

Antes da Release:

- Incorporar o Client ID durante a compilação.
- Fornecer o valor no workflow do GitHub Actions.
- Confirmar que **Enable Device Flow** está habilitado no OAuth App.
- Não incluir nem solicitar um Client Secret. O Device Flow não precisa dele.
- Testar o OAuth usando somente os arquivos instalados, sem `.env` local.

O Client ID identifica publicamente o OAuth App e pode estar no executável. Tokens,
Client Secrets e outras credenciais não podem ser incluídos no código ou nos
artefatos.

### Permissões OAuth atuais

A implementação solicita:

```text
read:user
repo
write:public_key
```

O escopo `repo` permite acesso amplo aos repositórios privados disponíveis para o
usuário. Essa permissão deve ser explicada claramente na interface e na documentação.

Testar o fluxo com:

- Conta pessoal.
- Organização privada.
- Organização com SAML SSO.
- Organização que restringe OAuth Apps.
- Usuário sem acesso ao repositório solicitado.
- Token revogado ou expirado.

## 2. Empacotar o credential helper

O `gitpersona-helper` é um executável separado. O `tauri.conf.json` ainda não o
declara como `externalBin` ou recurso do bundle.

Antes da Release:

- Compilar o helper em modo release no mesmo sistema e arquitetura do aplicativo.
- Incluir o helper como sidecar ou recurso do Tauri.
- Confirmar o nome esperado em cada sistema:
  - Linux: `gitpersona-helper`.
  - Windows: `gitpersona-helper.exe`.
- Garantir permissão de execução no Linux.
- Resolver o caminho instalado sem depender do `PATH`.
- Testar o helper depois de instalar, atualizar e reiniciar o computador.
- Testar o comportamento após desinstalar o Git Persona.

Um binário compilado para Linux não funciona no Windows. Cada job de build deve
compilar seu próprio helper.

## 3. Preservar a configuração global do Git

Ao ativar um perfil, o aplicativo altera:

```bash
git config --global user.name
git config --global user.email
git config --global credential.helper
```

O aplicativo não deve destruir helpers já utilizados pelo usuário, como Git
Credential Manager, `store`, `cache` ou `osxkeychain`.

Antes da Release:

- Ler todos os valores existentes de `credential.helper`.
- Preservar helpers não pertencentes ao Git Persona.
- Registrar o helper do Git Persona sem apagar configurações não relacionadas.
- Armazenar a configuração anterior quando isso for necessário para restauração.
- Remover somente a entrada do Git Persona ao desativá-lo ou desinstalá-lo.
- Nunca deixar o Git apontando para um helper que não existe mais.
- Definir o comportamento de `user.name` e `user.email` após a desinstalação.

Este item é crítico porque um caminho inválido em `credential.helper` pode impedir
clone, pull e push via HTTPS.

## 4. Preservar a configuração SSH

O Git Persona mantém um bloco gerenciado para `github.com` em `~/.ssh/config`.

Antes da Release:

- Preservar integralmente blocos não gerenciados pelo Git Persona.
- Testar quando já existe outro bloco `Host github.com`.
- Verificar a ordem das regras, pois o OpenSSH pode usar o primeiro valor encontrado.
- Manter permissões seguras no diretório `.ssh` e nas chaves privadas.
- Definir o que acontece com o bloco gerenciado durante a desinstalação.
- Não apagar chaves privadas sem confirmação explícita.
- Não remover configurações criadas por outras ferramentas.
- Testar nomes de usuário e caminhos que contenham espaços.

## 5. Release para Ubuntu e Linux

### Alvo inicial

```text
Formato: deb
Arquitetura: amd64
Ubuntu mínimo pretendido: 22.04
Versão adicional para testes: 24.04
```

Produzir a build em um runner Ubuntu. Usar uma base antiga compatível ajuda a evitar
que o binário exija uma versão de `glibc` mais recente do que a disponível no sistema
do usuário.

Comando pretendido:

```bash
npm run tauri:build -- --bundles deb
```

### Cuidados específicos

- Instalar no runner todas as dependências de compilação do Tauri.
- Conferir dependências de runtime para WebKitGTK, GTK e AppIndicator.
- Incluir o helper no pacote e confirmar permissão `755`.
- Testar GNOME Keyring e `libsecret` em uma sessão gráfica real.
- Testar o ícone e o menu da bandeja.
- Testar `xdg-open` e abertura do navegador.
- Testar se o app encontra `git`, `ssh-keygen` e navegadores instalados.
- Considerar que aplicativos gráficos podem não herdar o mesmo `PATH` do terminal.
- Testar escrita em `~/.gitconfig` e preservação de `~/.ssh/config`.
- Testar instalação, atualização, desinstalação e reinstalação.

Instalação manual para teste:

```bash
sudo apt install ./git-persona_0.1.0_amd64.deb
```

Como o arquivo será distribuído diretamente pelo GitHub, o `apt` não encontrará
atualizações automaticamente. Até existir um atualizador próprio, o usuário deverá
baixar cada nova versão pela página de Releases.

## 6. Release para Windows

### Alvo inicial

```text
Formato: NSIS setup.exe
Arquitetura: x64
Sistemas para teste: Windows 10 e Windows 11
```

Usar um runner Windows. Evitar cross-compilation enquanto houver uma alternativa
nativa no GitHub Actions.

Comando pretendido:

```bash
npm run tauri:build -- --bundles nsis
```

Artefato esperado:

```text
Git-Persona_0.1.0_x64-setup.exe
```

### Cuidados específicos

- Compilar `gitpersona-helper.exe` no mesmo runner.
- Incluir o helper no instalador.
- Testar com uma instalação atual do Git for Windows.
- Testar Windows Credential Manager.
- Testar instalação e disponibilidade do WebView2.
- Testar bandeja do sistema e inicialização automática.
- Testar detecção de Edge, Chrome, Firefox e outros navegadores.
- Testar instalação sem privilégios administrativos.
- Testar caminhos com espaços e caracteres não ASCII.
- Testar atualização sobre uma versão existente.
- Testar desinstalação e reinstalação.

O instalador NSIS do Tauri instala para o usuário atual por padrão, normalmente em
`%LOCALAPPDATA%`, sem exigir privilégios administrativos. Manter esse comportamento
inicialmente, salvo necessidade comprovada de instalação para todos os usuários.

### Assinatura de código

Um instalador não assinado pode ser publicado, mas o Windows SmartScreen pode exibir
avisos de editor desconhecido.

Para uma primeira pre-release, documentar claramente que o binário ainda não é
assinado. Para uma distribuição estável, considerar um certificado de assinatura de
código e assinar:

- O executável principal.
- O credential helper.
- O instalador NSIS.

O certificado e sua senha devem ser armazenados como secrets do GitHub Actions,
nunca no repositório.

## 7. Workflow do GitHub Actions

Criar um workflow acionado por tags de versão:

```yaml
on:
  push:
    tags:
      - "v*"
```

Estrutura pretendida:

```text
Tag v0.1.0
  Windows runner
    Testes
    Build do credential helper
    Build NSIS
    Upload do setup.exe

  Ubuntu runner
    Testes
    Build do credential helper
    Build Debian
    Upload do .deb

  Release job
    Download dos artefatos
    Geração de checksums SHA-256
    Criação da GitHub Release
    Anexação do .exe, .deb e SHA256SUMS.txt
```

Começar publicando como pre-release. Promover para uma Release estável somente após
testes em instalações limpas.

## 8. Versionamento

A versão aparece em mais de um arquivo:

- `package.json`.
- `apps/desktop/package.json`.
- `apps/desktop/src-tauri/Cargo.toml`.
- `apps/desktop/src-tauri/tauri.conf.json`.

Sincronizar todos antes de publicar. Para a primeira versão:

```text
Versão dos manifests: 0.1.0
Tag Git: v0.1.0
```

Considerar criar posteriormente um script que atualize todas as ocorrências para
evitar versões divergentes.

## 9. Política de instalação e remoção

Definir antes da primeira versão estável:

- Quais dados permanecem após a desinstalação.
- Se perfis e preferências serão preservados para uma futura reinstalação.
- Se as chaves SSH permanecem no disco.
- Como remover o bloco gerenciado de `~/.ssh/config`.
- Como remover ou restaurar `credential.helper`.
- Como tratar `user.name` e `user.email` globais.
- Como o usuário pode fazer backup dos perfis.

Nunca remover chaves, perfis ou configurações pessoais silenciosamente.

## 10. Checklist para a primeira pre-release

- [ ] Incorporar o OAuth Client ID na build.
- [ ] Habilitar Device Flow no OAuth App.
- [ ] Empacotar o credential helper no `.deb` e no `.exe`.
- [ ] Preservar credential helpers existentes.
- [ ] Revisar a integração com `~/.ssh/config`.
- [ ] Definir o comportamento de desinstalação.
- [ ] Sincronizar a versão em todos os manifests.
- [ ] Criar um workflow com runners Ubuntu e Windows.
- [ ] Executar lint e testes de frontend e Rust.
- [ ] Gerar o `.deb` em Ubuntu.
- [ ] Gerar o instalador NSIS em Windows.
- [ ] Testar o `.deb` em Ubuntu 22.04 e 24.04 limpos.
- [ ] Testar o `.exe` em Windows 10 e 11 limpos.
- [ ] Testar caminhos de usuário com espaços.
- [ ] Testar OAuth, HTTPS, SSH e organizações privadas.
- [ ] Testar upgrade, desinstalação e reinstalação.
- [ ] Gerar `SHA256SUMS.txt`.
- [ ] Publicar inicialmente como pre-release.
- [ ] Informar quando o instalador Windows não estiver assinado.

## 11. MacOS

O suporte a macOS fica fora do escopo inicial porque ainda não existe um ambiente
disponível para testes. Quando esse trabalho for retomado, será necessário avaliar:

- Build em hardware ou runner macOS.
- Compatibilidade com macOS Keychain.
- Empacotamento do credential helper.
- Assinatura com Apple Developer ID.
- Notarização do aplicativo.
- Geração e teste do `.dmg`.
- Bandeja, autostart, navegador, Git e SSH.

Não publicar nem declarar suporte oficial a macOS sem testar instalação, execução,
OAuth, chaveiro, Git, SSH, atualização e desinstalação em um sistema real.
