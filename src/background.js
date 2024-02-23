// Thunderbird can terminate idle backgrounds in manifest v3.
// Any listener directly added during add-on startup will be registered as a
// persistent listener and the background will wake up (restart) each time the
// event is fired. 


const regexAcademieDomain = /^ac-[a-zA-Z0-9-]+\.fr$/;

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {

  let parsed = parseSender(message.author);
  let email = parsed.email;
  let domain = parsed.domain;

  const configuration = JSON.parse(localStorage.getItem('configuration'));
  if (configuration == null) return;

  try {
    // Rechercher les élèves correspondant à l'email
    const eleves = await checkEleve(email);

    if (eleves.length > 0) {
      let eleveNames = eleves.map(eleve => eleve.nomEleve + " " + eleve.prenomEleve).join(", ");
      await messenger.notificationbar.create({
        windowId: tab.windowId,
        tabId: tab.id,
        priority: messenger.notificationbar.PRIORITY_CRITICAL_HIGH,
        label: "L'adresse " + email + " est celle du parent de : " + eleveNames + "",
        placement: "message",
        style: {
          "color": "rgb(255,255,255)",
          "background-color": "rgb(0,196,0)"
        }
      });
    } else {
      if (domain == configuration.domain || domain.endsWith("." + configuration.domain)) {
        await messenger.notificationbar.create({
          windowId: tab.windowId,
          tabId: tab.id,
          priority: messenger.notificationbar.PRIORITY_CRITICAL_HIGH,
          label: email + " est une adresse académique de " + domain,
          placement: "message",
          style: {
            "color": "rgb(255,255,255)",
            "background-color": "rgb(0,196,0)"
          }
        });
      }
      else if (regexAcademieDomain.test(domain)) {
        await messenger.notificationbar.create({
          windowId: tab.windowId,
          tabId: tab.id,
          priority: messenger.notificationbar.PRIORITY_WARNING_HIGH,
          label: email + " est une adresse e-mail d'une autre académie",
          placement: "message"
        });
      }
      else if (domain == "education.gouv.fr" || domain.endsWith(".education.gouv.fr")) {
        await messenger.notificationbar.create({
          windowId: tab.windowId,
          tabId: tab.id,
          priority: messenger.notificationbar.PRIORITY_WARNING_HIGH,
          label: email + " est une adresse e-mail rattachée au ministère de l'éducation nationale",
          placement: "message"
        });
      } else {
        await messenger.notificationbar.create({
          windowId: tab.windowId,
          tabId: tab.id,
          priority: messenger.notificationbar.PRIORITY_CRITICAL_HIGH,
          label: "L'adresse " + email + " est inconnue !",
          placement: "message"
        });
      }
    }
  } catch (error) {
    console.error("Erreur lors de la recherche des élèves:", error);
  }

});

function checkEleve(email) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("eleves", 1);

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      // Créer un nouvel objet de stockage pour les données CSV
      const objectStore = db.createObjectStore("eleves", { keyPath: "id", autoIncrement: true });
      // Créer des index pour chaque champ
      objectStore.createIndex("nom_eleve", "nomEleve", { unique: false });
      objectStore.createIndex("prenom_eleve", "prenomEleve", { unique: false });
      objectStore.createIndex("classe_eleve", "classeEleve", { unique: false });
      objectStore.createIndex("mail_responsable1", "mailResponsable1", { unique: false });
      objectStore.createIndex("nom_responsable1", "nomResponsable1", { unique: false });
      objectStore.createIndex("prenom_responsable1", "prenomResponsable1", { unique: false });
      objectStore.createIndex("mail_responsable2", "mailResponsable2", { unique: false });
      objectStore.createIndex("nom_responsable2", "nomResponsable2", { unique: false });
      objectStore.createIndex("prenom_responsable2", "prenomResponsable2", { unique: false });
    };

    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["eleves"], "readonly");
      const objectStore = transaction.objectStore("eleves");
      const index = objectStore.index("mail_responsable1");

      // Utiliser l'index pour récupérer les enregistrements correspondants à l'email
      const request = index.getAll(email.toLowerCase());

      request.onsuccess = function (event) {
        const eleves1 = event.target.result;

        // Répéter le processus avec le deuxième index
        const index2 = objectStore.index("mail_responsable2");
        const request2 = index2.getAll(email.toLowerCase());

        request2.onsuccess = function (event) {
          const eleves2 = event.target.result;

          // Fusionner les résultats de deux index
          const eleves = [...eleves1, ...eleves2];

          // Renvoyer les élèves correspondants à l'email
          resolve(eleves);
        };

        request2.onerror = function (event) {
          reject(event.target.error);
        };
      };

      request.onerror = function (event) {
        reject(event.target.error);
      };
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}


function parseSender(header) {
  // Expression régulière pour extraire le nom et l'email de l'expéditeur
  const senderRegex = /([^<]*)<([^>]*)>/;

  // Recherche du correspondant dans les en-têtes
  const match = header.match(senderRegex);

  // Si le correspondant est trouvé
  if (match) {
    // Récupération du nom et de l'email
    let name = match[1].trim();
    let email = match[2].trim().toLowerCase();

    // Si le nom est entre guillemets, le retirer
    if (name.startsWith('"') && name.endsWith('"')) {
      name = name.slice(1, -1);
    }

    // Extraction du domaine de l'email
    const domain = email.split('@')[1];

    // Retourne un objet avec le nom, l'email et le domaine
    return { name, email, domain };
  } else {
    // Si aucun correspondant trouvé, vérifier si l'email est valide
    const emailRegex = /[^@\s]+@[^@\s]+\.[^@\s]+/;
    const emailMatch = header.match(emailRegex);

    // Si une adresse email valide est trouvée
    if (emailMatch) {
      const email = emailMatch[0].trim().toLowerCase();
      // Extraction du domaine de l'email
      const domain = email.split('@')[1];
      // Retourne un objet avec l'email et le domaine
      return { email, domain };
    } else {
      // Si aucune adresse email valide n'est trouvée, retourne null
      return null;
    }
  }
}