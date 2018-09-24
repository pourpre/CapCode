import showdown from 'showdown';
// import '../../share/js/capcode-showdown';
import CodeMirror from 'codemirror';
import PerfectScrollbar from 'perfect-scrollbar';
import SQL from 'sql';
import {
    ajouterElement,
    ajouterElementAvant,
    lireFichier,
    chargerFichier,
    enregistrerFichier
} from '../../core/js/capcode-utils';
import {
    reponsesTests,
    reponsesEntrainements
} from './capcode-sql-reponses';

import '../style/capcode-sql.scss';

/* Les paramètres éventuellement passés dans le fichier markdown source sont accessibles via l'objet capcode.core.params */

const CONCEPTION = true;

let zoneDiapo,
    scrollbarTables,
    scrollbarDiapo,
    indexDiapo,
    editeur,
    boutonGo,
    zoneTables,
    zoneEditeur,
    zoneResultat,
    nbResultats,
    scrollbarResultat;

// Chargement de la page => initialisation de la coloration syntaxique dans la zone de saisie
document.addEventListener('capcodeCoreLoaded', function() {
    editeur = CodeMirror.fromTextArea(document.getElementById("editeur"), {
        lineNumbers: true,
        theme: "capcode-light",
        lineWrapping: true,
        mode: "text/x-pgsql",
        extraKeys: {
            'Ctrl-Enter': lancerRequete
        }
    });
    editeur.setValue('SELECT * FROM personnes;');
});

// Interface core en place => Finalisation de l'interface SQL
document.addEventListener('capcodeCoreInterface', function(event) {
    // Finalisation de l'interface (ajout de boutons spécifiques SQL...)
    const zoneActionsSQL = document.getElementById('actions-theme');

    // Bouton de sauvegarde de la saisie
    const imgLogo = ajouterElement('img', zoneActionsSQL, {
        class: ['logo'],
        src: 'assets/sql/logo_capsql.svg'
    });

    // Bouton de sauvegarde de la saisie
    const boutonDownload = ajouterElement('button', zoneActionsSQL, {
        class: ['btn', 'btn--default-light'],
        title: 'Sauvegarder'
    });
    const iconeBoutonDownload = ajouterElement('i', boutonDownload, {
        text: 'save',
        class: ['material-icons']
    });

    // Bouton de chargement d'un script précédemment sauvegardé
    const inputOpen = ajouterElement('input', zoneActionsSQL, {
        id: 'input-open',
        class: ['absent'],
        type: 'file'
    });
    const boutonInputOpen = ajouterElement('label', zoneActionsSQL, {
        class: ['btn', 'btn--default-light'],
        title: 'Ouvrir un fichier',
        for: 'input-open'
    });
    const iconeBoutonInputOpen = ajouterElement('i', boutonInputOpen, {
        text: 'folder',
        class: ['material-icons']
    });

    // Bouton d'inversion du thème
    const boutonTheme = ajouterElementAvant('li', document.getElementById('liste-plus'), document.getElementById('li-contact'));
    ajouterElement('i', boutonTheme, {
        class: ['material-icons'],
        text: 'toggle_theme'
    });
    ajouterElement('span', boutonTheme, {
        text: "Changer le thème",
        class: ['cliquable']
    });

    boutonGo = document.getElementById('bouton-go');
    zoneTables = document.getElementById('zone-tables');
    zoneEditeur = document.getElementById('zone-editeur');
    zoneResultat = document.getElementById('zone-resultat');
    nbResultats = document.getElementById('nb-resultats');
    scrollbarResultat = new PerfectScrollbar(zoneResultat);

    /* EVENEMENTS
     * ---------------------------------------------------------------------------------------------- */
    // Boutons d'action "Go"
    boutonGo.addEventListener('click', lancerRequete);
    boutonGo.classList.add('absent');

    // A chaque changement de diapo, actualisation des scrollbars
    document.addEventListener('capcodeCoreChgtDiapo', function(event) {
        indexDiapo = event.detail.index;
        scrollbarDiapo.update();
    });

    // Bouton d'action "Sauvegarder"
    boutonDownload.addEventListener('click', function() {
        enregistrerFichier(editeur.getValue(), 'Sans nom.sql', 'text/sql');
    });

    // Chargement d'un fichier
    inputOpen.addEventListener('change', function(event) {
        lireFichier(event.target.files[0], function(contenu) {
            editeur.setValue(contenu);
        });
    });

    // Inversion du thème
    boutonTheme.addEventListener('click', function(event) {
        const theme = editeur.getOption('theme') == 'capcode-dark' ? 'capcode-light' : 'capcode-dark';
        editeur.setOption('theme', theme);
    });

    // Mise à jour des scrollbars
    zoneDiapo = document.getElementById('zone-diapo');
    scrollbarDiapo = new PerfectScrollbar(zoneDiapo);

    // Affichage de la liste des tables
    afficherTables();
});



// Chargement des tables sur le "serveur"
var db = new SQL.Database();
chargerFichier('assets/sql/capcode-sql-data.sql', function(script) {
    db.exec(script);
});



function lancerRequete() {
    const dbPromise = new Promise(function(resolve, reject) {
            const requete = db.exec(editeur.getValue());
            resolve(requete);
        })
        .then(function(resultat) {
            afficherResultat(resultat[resultat.length - 1]);
        })
        .catch(function(erreur) {
            afficherErreur(erreur);
        });
}

function verifierQuestions(index, queryResult) {
    const jsonResultat = hashReponse(JSON.stringify(queryResult));

    if (CONCEPTION) {
        console.log('Diapo ' + index, jsonResultat);
    }

    // La requête répond-elle à un test bloquant ?
    for (let test in reponsesTests['diapo' + index]) {
        if (reponsesTests['diapo' + index].hasOwnProperty(test)) {
            const reponseProposee = reponsesTests['diapo' + index][test];
            if (reponseProposee === jsonResultat) {
                emettreQuestionReussie(index, test, 'test');
            }
        }
    }

    // La requête répond-elle à un entrainement ?
    for (let entrainement in reponsesEntrainements['diapo' + index]) {
        if (reponsesEntrainements['diapo' + index].hasOwnProperty(entrainement)) {
            const reponseProposee = reponsesEntrainements['diapo' + index][entrainement];
            if (reponseProposee === jsonResultat) {
                // Emission d'un signal pour mise à jour du diaporama
                emettreQuestionReussie(index, entrainement, 'entrainement');
            }
        }
    }
}

function emettreQuestionReussie(index, test, type) {
    const testReussi = new CustomEvent('capcodeCoreQuestionReussie', {
        detail: {
            indexDiapo: index + 1,
            questionId: test,
            type: type
        }
    });
    document.dispatchEvent(testReussi);
}

function afficherResultat(resultat) {
    zoneResultat.innerHTML = '';

    verifierQuestions(indexDiapo, resultat);

    if (resultat === undefined) { // Aucun résultat
        nbResultats.innerText = 'Aucune ligne extraite'; // Affichage du nombre de lignes
    } else { // Présence d'au moins un résultat
        // Affichage du nombre de lignes
        if (resultat.values.length === 1) {
            nbResultats.innerText = '1 ligne extraite';
        } else {
            nbResultats.innerText = resultat.values.length + ' lignes extraites';
        }

        // Tableau de résultats

        const tableResultat = document.createElement('table');
        const theadResultat = document.createElement('thead');
        const tbodyResultat = document.createElement('tbody');
        const trTheadResultat = document.createElement('tr');

        resultat.columns.forEach(function(colonne) {
            const thTrTheadResultat = document.createElement('th');
            thTrTheadResultat.innerText = colonne;
            trTheadResultat.appendChild(thTrTheadResultat);
        });

        theadResultat.appendChild(trTheadResultat);
        tableResultat.appendChild(theadResultat);

        resultat.values.forEach(function(ligne) {
            const trTbodyResultat = document.createElement('tr');

            ligne.forEach(function(valeur) {
                const tdTrTbodyResultat = document.createElement('td');
                tdTrTbodyResultat.innerText = valeur;
                trTbodyResultat.appendChild(tdTrTbodyResultat);
            });

            tbodyResultat.appendChild(trTbodyResultat);
        });

        tableResultat.appendChild(tbodyResultat);

        zoneResultat.appendChild(tableResultat);
    }

    scrollbarResultat.update();
}

function afficherErreur(erreur) {
    zoneResultat.innerHTML = '';
    nbResultats.innerText = 'Une erreur s\'est produite :(';

    const pErreur = document.createElement('p');
    pErreur.innerText = erreur;
    pErreur.classList.add('erreur');
    zoneResultat.appendChild(pErreur);
}

function hashReponse(reponse) {
    let hash = 0;
    if (reponse.length == 0) {
        return hash;
    }
    for (let i = 0; i < reponse.length; i++) {
        let char = reponse.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

// Alimentation de la liste des tables
function afficherTables() {
    const listeTables = db.exec("SELECT name FROM sqlite_master WHERE type='table';");
    const ulTables = document.createElement('ul');
    const spanTable = document.createElement('span');

    listeTables[0].values.forEach(function(table) {

        if (table != 'sqlite_sequence') {
            const liTable = document.createElement('li');
            liTable.classList.add('compact');
            liTable.innerText = table;
            liTable.title = 'Afficher les colonnes de la table';
            liTable.addEventListener('click', function(event) {
                event.target.classList.toggle('compact');
            });

            // Nom des tables

            const ulColonnes = document.createElement('ul');
            const liColonne = document.createElement('li');
            const listeColonnes = db.exec("pragma table_info(" + table + ");");

            listeColonnes[0].values.forEach(function(colonne) {
                liColonne.innerHTML = colonne[1] + ' <span class="type">' + colonne[2] + '</span>';
                ulColonnes.appendChild(liColonne.cloneNode(true));
            });

            liTable.appendChild(ulColonnes.cloneNode(true));
            ulTables.appendChild(liTable);
        }
    });
    zoneTables.appendChild(ulTables);
    scrollbarTables = new PerfectScrollbar(zoneTables);
}
