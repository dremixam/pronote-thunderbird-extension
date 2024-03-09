// Thunderbird can terminate idle backgrounds in manifest v3.
// Any listener directly added during add-on startup will be registered as a
// persistent listener and the background will wake up (restart) each time the
// event is fired. 


const regexAcademieDomain = /^ac-[a-zA-Z0-9-]+\.fr$/;

// Création de la configuration par défaut si elle n'existe pas déja
if (localStorage.getItem('configuration') == null) {
  const configuration = {
    domain: "ac-rennes.fr",
    nomEleve: "NOM",
    prenomEleve: "PRENOM",
    classeEleve: "CLASSES",
    mailResponsable1: "R1_EMAIL",
    nomResponsable1: "R1_NOM",
    prenomResponsable1: "R1_PRENOM",
    mailResponsable2: "R2_EMAIL",
    nomResponsable2: "R2_NOM",
    prenomResponsable2: "R2_PRENOM",
  };
  
  // Sauvegarder la configuration dans localStorage
  localStorage.setItem('configuration', JSON.stringify(configuration));
}

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {

  let parsed = parseSender(message.author);
  let email = parsed.email;
  let domain = parsed.domain;

  const configuration = JSON.parse(localStorage.getItem('configuration'));
  if (configuration == null) return;

  try {
    // Rechercher les élèves correspondant à l'email
    const eleves = await getElevesByEmail(email);

    if (eleves.length > 0) {
      let eleveNames = eleves.map(eleve => eleve.nomEleve + " " + eleve.prenomEleve + " (" + eleve.classeEleve + ")").join(", ");
      await messenger.notificationbar.create({
        windowId: tab.windowId,
        tabId: tab.id,
        priority: messenger.notificationbar.PRIORITY_CRITICAL_HIGH,
        label: "L'adresse " + email + " est celle de l'un des responsables de : " + eleveNames + "",
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
          priority: messenger.notificationbar.PRIORITY_INFO_HIGH,
          label: email + " est une adresse académique de " + domain,
          placement: "message"
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
          priority: messenger.notificationbar.PRIORITY_INFO_HIGH,
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

// Function to check if the email is mail_responsable1 ou mail_responsable2 of an eleve
const getElevesByEmail = (email) => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("eleves", 1);

    if (email == null || email == "") {
      resolve([]);
      return;
    }

    request.onupgradeneeded = function (event) {
      const db = event.target.result;
      const objectStore = db.createObjectStore("eleves", { keyPath: "id", autoIncrement: true });
      objectStore.createIndex("mail_responsable1", "mailResponsable1", { unique: false });
      objectStore.createIndex("mail_responsable2", "mailResponsable2", { unique: false });
    };

    request.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction(["eleves"], "readonly");
      const objectStore = transaction.objectStore("eleves");

      const index1 = objectStore.index("mail_responsable1");
      const index2 = objectStore.index("mail_responsable2");

      const request1 = index1.getAll(email.toLowerCase());
      const request2 = index2.getAll(email.toLowerCase());

      let eleves = [];

      request1.onsuccess = function (event) {
        eleves = event.target.result;
        request2.onsuccess = function (event) {
          eleves = [...eleves, ...event.target.result];
          const uniqueEleves = [...new Set(eleves)];
          resolve(uniqueEleves);
        };
        request2.onerror = function (event) {
          reject(event.target.error);
        };
      };

      request1.onerror = function (event) {
        reject(event.target.error);
      };
    };

    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
};

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