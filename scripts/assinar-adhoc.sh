#!/bin/bash
# Assinatura ad-hoc do app empacotado (macOS).
#
# POR QUE: sem identidade da Apple, o electron-builder empacota o binário do Electron
# SEM re-assinar — o app sai com `Identifier=Electron`, `Sealed Resources=none` e a
# assinatura original do Electron, que o macOS trata como REVOGADA:
#   spctl -a -vvv → "notarization indicates this code has been revoked"
# Nesse estado o sistema não só recusa abrir: APAGA o .app do disco (visto 07/09/2026,
# tanto em /Applications quanto na pasta dist).
#
# Assinar ad-hoc (`--sign -`) resolve para uso local: o app passa a ter identidade
# própria e recursos selados. Continua "rejected" pelo Gatekeeper — o que é o normal
# para app sem Developer ID — mas abre e não é mais apagado.
#
# A ordem importa: de dentro para fora (bibliotecas → frameworks → helpers → app).
# `--deep` faria numa tacada só, mas a Apple desencoraja e ele erra em bundle aninhado.
#
# Uso: scripts/assinar-adhoc.sh "dist/mac-arm64/Pediu! Desktop Beta.app"
set -e
APP="$1"
[ -d "$APP" ] || { echo "✗ app não encontrado: $APP"; exit 1; }

echo "→ bibliotecas e módulos nativos"
find "$APP" \( -name "*.dylib" -o -name "*.node" \) -print0 | while IFS= read -r -d '' f; do
  codesign --force --sign - --timestamp=none "$f"
done

echo "→ frameworks"
for fw in "$APP/Contents/Frameworks/"*.framework; do
  [ -d "$fw" ] || continue
  codesign --force --sign - --timestamp=none "$fw/Versions/A" 2>/dev/null || codesign --force --sign - --timestamp=none "$fw"
done

echo "→ helpers"
for h in "$APP/Contents/Frameworks/"*.app; do
  [ -d "$h" ] || continue
  codesign --force --sign - --timestamp=none "$h"
done

echo "→ app"
codesign --force --sign - --timestamp=none "$APP"

echo "→ conferindo"
codesign --verify --deep --strict "$APP" && echo "  assinatura válida"
codesign -dv --verbose=2 "$APP" 2>&1 | grep -E "Identifier|Sealed"
