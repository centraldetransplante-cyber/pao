#!/usr/bin/env bash
# Gera o keystore de release e o keystore.properties (nunca comitar nenhum dos dois).
# Rode isto DENTRO da pasta android/, na VM.
set -e

KEYSTORE_FILE="devocional-release.jks"
ALIAS="devocional"

if [ -f "$KEYSTORE_FILE" ]; then
  echo "Ja existe $KEYSTORE_FILE aqui. Apague-o primeiro se quiser gerar um novo (isso invalida updates futuros do app!)."
  exit 1
fi

read -srp "Senha do keystore (guarde bem, sem ela nunca mais atualiza o app): " STORE_PASS
echo
read -srp "Confirme a senha: " STORE_PASS_CONFIRM
echo
if [ "$STORE_PASS" != "$STORE_PASS_CONFIRM" ]; then
  echo "Senhas nao conferem."
  exit 1
fi

keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$STORE_PASS" -keypass "$STORE_PASS" \
  -dname "CN=Rafael, OU=Devocional, O=Pessoal, L=Brasil, S=BR, C=BR"

cat > keystore.properties <<EOF
storeFile=$KEYSTORE_FILE
storePassword=$STORE_PASS
keyAlias=$ALIAS
keyPassword=$STORE_PASS
EOF

echo
echo "Pronto: $KEYSTORE_FILE e keystore.properties criados em $(pwd)."
echo "Guarde uma copia do $KEYSTORE_FILE em lugar seguro (fora da VM) -- perdendo ele, nunca mais atualiza o app."
echo "Agora rode: ./gradlew assembleRelease"
