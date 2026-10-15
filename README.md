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

## Instalação no PS5

1. Copie o arquivo `PokeBonk-PS5.pkg` para a raiz de um pendrive formatado em exFAT.
2. No PS5 com jailbreak ativo, acesse o **Package Installer** (nas Debug Settings ou via Itemzflow) e instale o PKG.
3. Inicie o jogo diretamente pela Dashboard do PS5. O navegador WebKit abrirá em tela cheia no jogo já com o DualSense mapeado.

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

