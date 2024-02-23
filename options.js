document.addEventListener('DOMContentLoaded', function () {
    const boutonsSauvegarderConfiguration = document.getElementsByClassName('bouton-sauvegarder-configuration');
    const boutonImporterCSV = document.getElementById('bouton-importer-csv');

    // Charger la configuration actuelle lors du chargement de la page
    chargerConfiguration();

    for (var i = 0; i < boutonsSauvegarderConfiguration.length; i++) {
        boutonsSauvegarderConfiguration[i].addEventListener('click', function () {
            sauvegarderConfiguration();
        });
    }

    boutonImporterCSV.addEventListener('click', function () {
        importerCSV();
    });
});

function sauvegarderConfiguration() {
    const configuration = {
        domain: document.getElementById('champ-domain').value,
        nomEleve: document.getElementById('champ-nom-eleve').value,
        prenomEleve: document.getElementById('champ-prenom-eleve').value,
        classeEleve: document.getElementById('champ-classe-eleve').value,
        mailResponsable1: document.getElementById('champ-mail-responsable1').value,
        nomResponsable1: document.getElementById('champ-nom-responsable1').value,
        prenomResponsable1: document.getElementById('champ-prenom-responsable1').value,
        mailResponsable2: document.getElementById('champ-mail-responsable2').value,
        nomResponsable2: document.getElementById('champ-nom-responsable2').value,
        prenomResponsable2: document.getElementById('champ-prenom-responsable2').value
    };

    // Sauvegarder la configuration dans localStorage
    localStorage.setItem('configuration', JSON.stringify(configuration));
    console.log('Configuration sauvegardée:', configuration);
}

function chargerConfiguration() {
    // Charger la configuration depuis localStorage
    const configuration = JSON.parse(localStorage.getItem('configuration'));
    if (configuration) {
        // Mettre à jour les champs de l'interface avec la configuration chargée
        document.getElementById('champ-domain').value = configuration.domain;
        document.getElementById('champ-nom-eleve').value = configuration.nomEleve;
        document.getElementById('champ-prenom-eleve').value = configuration.prenomEleve;
        document.getElementById('champ-classe-eleve').value = configuration.classeEleve;
        document.getElementById('champ-mail-responsable1').value = configuration.mailResponsable1;
        document.getElementById('champ-nom-responsable1').value = configuration.nomResponsable1;
        document.getElementById('champ-prenom-responsable1').value = configuration.prenomResponsable1;
        document.getElementById('champ-mail-responsable2').value = configuration.mailResponsable2;
        document.getElementById('champ-nom-responsable2').value = configuration.nomResponsable2;
        document.getElementById('champ-prenom-responsable2').value = configuration.prenomResponsable2;
        console.log('Configuration chargée:', configuration);
    } else {
        console.log('Aucune configuration trouvée dans le localStorage.');
    }
}

function importerCSV() {
    const fichierCSV = document.getElementById('fichier-csv').files[0];

    if (!fichierCSV) {
        console.error('Aucun fichier CSV sélectionné.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const contenuCSV = event.target.result;
        Papa.parse(contenuCSV, {
            header: true,
            complete: function (result) {
                const lignes = result.data;
                const configuration = JSON.parse(localStorage.getItem('configuration'));

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
                    const transaction = db.transaction(["eleves"], "readwrite");
                    const objectStore = transaction.objectStore("eleves");

                    // Supprimer toutes les données de la base
                    const clearRequest = objectStore.clear();
                    clearRequest.onsuccess = function (event) {
                        console.log("Base de données vidée avec succès.");
                        // Insérer de nouvelles données
                        insererDonnees(lignes, objectStore, configuration);

                    };
                    clearRequest.onerror = function (event) {
                        console.error("Erreur lors de la suppression des données:", event.target.error);
                    };
                };

                request.onerror = function (event) {
                    console.error("Erreur lors de l'ouverture de la base de données:", event.target.error);
                };
            }
        });
    };

    reader.readAsText(fichierCSV);
}

function insererDonnees(lignes, objectStore, configuration) {
    let error = 0;
    let processed = 0;
    lignes.forEach((ligne, index, array) => {
        console.log(ligne);
        const donnees = {
            nomEleve: ligne[configuration.nomEleve] ?? '',
            prenomEleve: ligne[configuration.prenomEleve] ?? '',
            classeEleve: ligne[configuration.classeEleve] ?? '',
            mailResponsable1: ligne[configuration.mailResponsable1] ?? '',
            nomResponsable1: ligne[configuration.nomResponsable1] ?? '',
            prenomResponsable1: ligne[configuration.prenomResponsable1] ?? '',
            mailResponsable2: ligne[configuration.mailResponsable2] ?? '',
            nomResponsable2: ligne[configuration.nomResponsable2] ?? '',
            prenomResponsable2: ligne[configuration.prenomResponsable2] ?? ''
        };
        console.log('Données extraites de la ligne :', donnees);

        // Ajouter les données à l'objet de stockage
        const request = objectStore.add(donnees);
        request.onsuccess = function () {
            console.log('Donnée insérée avec succès.');

            processed++;
            if (processed === array.length) {
                if (error == 0) {
                    window.alert(processed + " élèves ajoutés avec succès");
                }
                else {
                    window.alert(processed + " élèves ajoutés. " + error + " comportentn des erreurs.");
                }
            }

        };
        request.onerror = function (event) {
            console.error('Erreur lors de l\'insertion des données:', event.target.error);
            processed++;
            error++;
        };
    });
}