# Pubblicazione gratuita — opzioni

Il pacchetto è statico: non richiede server applicativo.

## Scelta consigliata per la prima prova: Netlify Drop / Cloudflare Pages / GitHub Pages

Carica **il contenuto della cartella TrainingJournal_PWA_v0.1.0**, mantenendo `index.html` nella radice del sito. Il provider deve restituire HTTPS.

## Firebase Hosting (utile quando aggiungeremo la sincronizzazione)

Quando avrai creato il progetto Firebase potremo aggiungere la configurazione Firebase Hosting e poi collegare Firestore/Auth. Non è necessario per questa prima versione offline.

## Importante

- non aprire `index.html` direttamente dall'app File su iPad: in modalità `file://` il service worker non può funzionare;
- la PWA va aperta da Safari su un indirizzo HTTPS almeno la prima volta;
- usa periodicamente **Profilo → Esporta backup**.
