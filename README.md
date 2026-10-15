# PokéBonk PS5

Port do jogo **PokéBonk** para PlayStation 5 via WebKit / Browser em tela cheia, com suporte completo ao controle **DualSense**.

## Controles (DualSense)

| Botão | Ação no Jogo |
|---|---|
| **Analógico Esquerdo** | Movimentação 360° analógica (WASD) |
| **Analógico Direito** | Controle de Câmera 3D livre |
| **R2** | Tecla `R` (Ultimate / Recarga) |
| **L2 / Quadrado** | Habilidade Q (`KeyQ`) |
| **Triângulo / R1** | Habilidade E (`KeyE`) |
| **L1** | Sprint / Correr (`ShiftLeft`) |
| **X (Cruz)** | Pulo (`Space`) / Confirmar seleção em menus |
| **Círculo** | Cancelar / Voltar (`Escape`) |
| **D-Pad (Cruzeta)** | Navegação de Menus / Seleção de Upgrades |
| **Options** | Pausar (`Escape`) |

## Modos de Instalação no PS5

### Modo 1: Offline (Recomendado - 100% Sem Internet no PS5)
1. Extraia o conteúdo de `pokebonk-offline-files.zip` para a pasta `/data/pokebonk/` no armazenamento interno do seu PS5 (via FTP, File Manager do etaHEN ou Itemzflow).
2. Instale o pacote **`PokeBonk-Offline-PS5.pkg`** no PS5 via Package Installer.
3. Inicie o jogo pela Dashboard. Ele lerá os arquivos diretamente do SSD local em `http://127.0.0.1:8080/pokebonk/`, com carregamento instantâneo, sem internet e com controles do DualSense ativos.

### Modo 2: Online (GitHub Pages)
1. Instale o arquivo **`PokeBonk-PS5.pkg`** no PS5 via Package Installer.
2. Inicie o jogo pela Dashboard. Ele abrirá diretamente a versão hospedada no seu GitHub Pages (`https://isrmicha.github.io/pokebonk-ps5/`).

## Recompilando o PKG

Caso queira alterar a URL de destino (por exemplo para um servidor local em sua rede):

```powershell
.\build-pkg.ps1 -Url "http://192.168.1.100:8080/"
```

## Sincronizando com o PokéBonk Oficial

Para atualizar os arquivos do jogo quando o site oficial receber novos updates:

```powershell
.\sync-assets.ps1
```
O script baixa automaticamente os novos bundles do Vite, remove chunks antigos, atualiza os dados e reaplica os patches de controle do PS5.

