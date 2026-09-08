# Devocional pessoal do Rafael — recado para a próxima sessão

Tudo para honra e glória de Deus Pai, por Jesus Cristo, pelo Espírito Santo.

## O que é

App devocional pessoal (Capacitor/Android) com 365 dias de leitura: Novo Testamento
inteiro + 105 Salmos, texto real da Bíblia ACF (domínio público) mais reflexão e
paráfrase em linguagem contemporânea para cada dia, geradas lendo o capítulo real (não
texto genérico).

- `www/` — front-end (HTML/JS/CSS puro, sem framework), roda como WebView Android via
  Capacitor.
- `www/bible-acf.json` — Bíblia completa.
- `www/plano.json` — plano de leitura dos 365 dias (gerado por `build-plan.js`).
- `www/reflexoes.json` — reflexão + `modernText` por dia (gerado por 5 agentes em
  paralelo + `merge-reflexoes.js`).
- `android/` — projeto Android nativo gerado pelo Capacitor.
- `backend/` — API Node/Express/SQLite opcional para sincronizar anotações entre
  aparelhos (cadastro/login por e-mail+senha, JWT). Ainda não está deployada em lugar
  nenhum — só existe local/commitada.

## Estado no fim desta sessão

- APK debug já compilado e instalado com sucesso no celular do Rafael (Redmi, Android 16,
  `com.rafael.devocional`).
- Build release assinado configurado (`android/gerar-keystore.sh` +
  `android/keystore.properties.example`) mas keystore ainda não gerado.
- Backend escrito e testado sintaticamente, mas nunca deployado (nem na VM, nem em
  Docker rodando de fato).
- **Push para este repo (`centraldetransplante-cyber/pao`) é bloqueado pelo classificador
  de segurança do Claude Code quando a sessão roda a partir da conta/máquina do agente**
  — tratado como possível exfiltração por o nome da org não bater com a identidade git
  local (`RafaelEliasIoppi`). Se você é uma sessão futura do Claude tentando dar push
  aqui e ele falhar do mesmo jeito: não insista, avise o Rafael e deixe ele rodar
  `git push` manualmente do lado dele.

## Ambiente de build (se for buildar de novo nesta rede)

A rede onde isso foi construído é institucional (Secretaria Estadual da Saúde/RS,
proxy McAfee com interceptação TLS) e tem particularidades:

- SSH de saída (porta 22) é bloqueado — nem adianta tentar alcançar VMs por SSH direto
  dessa rede.
- Java/Gradle não confia na CA do proxy por padrão — precisa importar a CA numa cópia
  local do truststore (nunca no cacerts do sistema) e passar `-Djavax.net.ssl.trustStore=...`.
- O proxy tem instabilidade real: downloads HTTPS aleatórios falham com 407
  intermitentemente. A solução que funcionou foi rodar o build em loop (3-8 tentativas),
  já que cada tentativa aproveita o cache do que baixou com sucesso antes.
- Desativar autenticação Negotiate/Kerberos no proxy Java com
  `-Djdk.http.auth.proxying.disabledSchemes=Negotiate,Kerberos -Dhttp.auth.preference=Basic`
  — sem isso o Java insiste em Kerberos antes de tentar a senha (Basic).
- Precisa de JDK 11+ (o padrão da máquina é Java 8). Havia um `jdk-21.0.12` zipado solto
  na raiz de `biblioteca/` que resolveu isso.
- Android SDK não vinha instalado — precisou baixar cmdline-tools + `platforms;android-35`
  + `build-tools;35.0.0` via `sdkmanager`.

## Pendências conhecidas

1. Deploy do backend em algum servidor real (a VM Oracle do Rafael era a ideia original,
   mas nunca foi alcançada por SSH nesta sessão).
2. Push manual do Rafael para sincronizar o repo remoto com os últimos commits locais.
3. Gerar o keystore de release se ele quiser distribuir a versão assinada.
