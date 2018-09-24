import showdown from 'showdown';
import Prism from 'prismjs';
import alertify from 'alertify';

import '../../core/js/capcode-showdown';
import {
    ajouterElement,
    chargerFichier
} from '../../core/js/capcode-utils';
import '../style/capcode-theme-base.scss';



/* CONSTITUTION DE L'INTERFACE
 * Ajout d'éléments DOM
 * ------------------------------------------------------------------------------------------ */

// Déclaration des variables
let nomCookie,
    progression, // Progression dans le diaporama
    listeDiapos = [], // Liste des diapos,
    diapoVisible, // Diapo affichée
    itemNavigationActif, // Item actif dans le menu de navigation
    els = {}, // Liste des éléments d'interface (exporté)
    params = { // Paramètres passés en commentaire dans le fichier markdown source
        raw: {},
        bodyStyles: {}
    },
    maxDiapoAccessible, // Dernière diapo non bloquée par un test à valider
    listeQuestionsAFaire = {
        diapo1: {
            tests: [],
            entrainements: []
        }
    }, // Liste des questions restant à traiter
    listeDivQuestions; // Liste des entrainements et évaluations bloquantes du diaporama

// Désactivation des transitions pendant le chargement de la indexPage
document.body.classList.add('preload');
// Réactivation des transitions lorsque le diaporama est chargé
window.onload = function() {
    document.body.classList.remove('preload');

    alertify.logPosition("bottom right").maxLogItems(3).delay(5000);

    // Emission d'un événement "Page chargée"
    const evtLoad = new CustomEvent('capcodeCoreLoaded', {
        "bubbles": true,
        "cancelable": false
    });

    document.dispatchEvent(evtLoad);
};

/* CONSTITUTION DU DIAPORAMA : Découpage de la source, interactions
 * @param source (string) Nom du fichier markdown à transformer en diaporama
 * @param dir (string) Chemin vers le dossier contenant la source
 */

const setDiaporama = function(source, dir, cookie) {
    nomCookie = cookie;
    /* LOCALSTORAGE
     * Enregistrement de la progression
     * ---------------------------------------------------------------------------------------------- */
    if (!localStorage.getItem(nomCookie)) {
        progression = {
            testsReussis: [],
            entrainementsReussis: []
        };
        updateCookie(progression, nomCookie);
    } else {
        progression = JSON.parse(localStorage.getItem(nomCookie));
    }
    // localStorage.clear();


    // Construction du DOM
    construireInterface();

    // Lecture des sources
    let md = '';
    source.forEach(function charger(fichier) {
        chargerFichier(dir + fichier + '.md', function concatener(fichierMd) {
            md += fichierMd + '\n';
        });
    });

    // Génération du contenu HTML (voir script showdown.js)
    const converter = new showdown.Converter({
        extensions: ['capcode'],
        tables: true
    });
    converter.setFlavor('github');
    els.zoneDiapo.innerHTML = converter.makeHtml(md);


/* Récupération des paramètres spécifiés dans le fichier source
 * ---------------------------------------------------------------------------------------------- */
    const nodeIterator = document.createNodeIterator(els.zoneDiapo, NodeFilter.SHOW_COMMENT);
    let currentNode;
    while (currentNode = nodeIterator.nextNode()) {
        const regex = /\s*@(\S+)\s*:\s*(.+)\s*/g;
        let match;
        while (match = regex.exec(currentNode.textContent)) {
            params.raw[match[1]] = match[2];

            // Documents annexés téléchargeables
            if (match[1] == 'doc') {
                ajouterDocs(match[2]);
            }

            // ajout d'un email de contact
            else if (match[1] == 'contact') {
                ajouterContact(match[2]);
            }

            // Ajout des styles gobaux à certaines diapos
            else if (match[1].startsWith('diapo-avec-style-')) {
                const listeDiapoStyles = match[2].split(/\s*,\s*/);
                listeDiapoStyles.forEach(function(numDiapo) {
                    if (!params.bodyStyles.hasOwnProperty(numDiapo)) {
                        params.bodyStyles[numDiapo] = [];
                    }
                    params.bodyStyles[numDiapo].push(match[1].substr(17));
                });
            }
        }
    }


    // Découpage du diaporama
    // Parcours du DOM
    const section = document.createElement('section');
    section.classList.add('fade-out');

    let diapo = {};

    for (let i = 0; i < els.zoneDiapo.children.length; i++) {
        const noeud = els.zoneDiapo.children[i];

        // Si l'élément rencontré est de type <h1> ou <h2>, une nouvelle diapo (<section>) est initiée,
        // sinon, le noeud est ajouté à la diapo en cours.
        if (noeud.nodeName == 'H1' || noeud.nodeName == 'H2') {

            // Application d'une classe H1 ou H2 à la diapo selon le type de titre
            DOMTokenList.prototype.remove.apply(section.classList, ['H1', 'H2']);
            section.classList.add(noeud.nodeName);

            // La nouvelle diapo n'est créée que si la diapo en cours est non vide (cas d'un
            // diapo ne débutant pas par un élément <h1> ou <h2>)
            if (section.lastElementChild) { // lastElementChild retourne NULL si l'élément est vide

                // Footer de diapo (bouton "Continuer")
                const conteneurBoutonContinuer = ajouterElement('div', section, {
                    class: ['footer-diapo']
                });

                const boutonPrecedent = ajouterElement('button', conteneurBoutonContinuer, {
                    text: 'Continuer',
                    class: ['btn', 'btn--primary-light', 'btn--text', 'bouton-continuer'],
                    disabled: true
                });

                diapo.contenu = section.cloneNode(true); // Enregistrement de la diapo
                diapo.contenu.classList.add('diapo-' + (listeDiapos.length + 1));
                listeDiapos.push(diapo);

                // Nouvelle diapo => Réinitialisation de la <section> et de l'objet "diapo"
                while (section.lastElementChild) {
                    section.removeChild(section.lastElementChild);
                }
                diapo = {
                    titre: noeud.innerText
                };
                listeQuestionsAFaire['diapo' + (listeDiapos.length + 1)] = {
                    tests: [],
                    entrainements: []
                };
            }
        } else if (!section.lastElementChild) { // Le diaporama ne commence pas par une balise H1
            diapo.titre = 'Introduction';
        }

        if (noeud.classList.contains('test')) {
            if (progression.testsReussis.indexOf(noeud.id.substr(5)) === -1) {
                listeQuestionsAFaire['diapo' + (listeDiapos.length + 1)].tests.push(noeud.id.substr(5)); // Liste des tests bloquants de la diapo
            }
            // Test réussi précédemment et stocké dans le cookie
            else {
                noeud.classList.add('reussi');
            }
        } else if (noeud.classList.contains('entrainement') && progression.testsReussis.indexOf(noeud.id.substr(13)) === -1) {
            if (progression.entrainementsReussis.indexOf(noeud.id.substr(13)) === -1) {
                listeQuestionsAFaire['diapo' + (listeDiapos.length + 1)].entrainements.push(noeud.id.substr(13)); // Liste des entrainements de la diapo
            }
            // Entrainement réussi précédemment et stocké dans le cookie
            else {
                noeud.classList.add('reussi');
            }
        }

        // Ajout du noeud  à un élément <section>
        section.appendChild(noeud.cloneNode(true));
    }

    // Enregistrement de la dernière section en cours
    diapo.contenu = section.cloneNode(true);
    listeDiapos.push(diapo);

    // Reconstitution du diaporama à partir des éléments <section> enregistrés
    // Réinitialisation du conteneur principal
    while (els.zoneDiapo.lastElementChild) {
        els.zoneDiapo.removeChild(els.zoneDiapo.lastElementChild);
    }

    listeDiapos.forEach(function(diapo, index) {
        // Ajout des diapos
        els.zoneDiapo.appendChild(diapo.contenu);

        // Constitution du menu de navigation
        const itemNavigation = ajouterElement('li', els.ulMenuNavigation, {
            class: ['inactif']
        });
        itemNavigation.innerHTML = diapo.titre;
    });
    // Ajustement de la largeur du conteneur du menu de navigation
    els.menuNavigation.style['column-count'] = Math.ceil(listeDiapos.length / ((window.innerHeight-34) / 25));

    // Affichage du nombre total de diapos
    els.nbDiapo.innerHTML = listeDiapos.length;

    // NAVIGATION
    // Navigation par les boutons suivant et précédent
    els.boutonPrecedent.addEventListener('click', function(event) {
        naviguer(listeDiapos.indexOf(diapoVisible) - 1);
    });
    els.boutonSuivant.addEventListener('click', function(event) {
        naviguer(listeDiapos.indexOf(diapoVisible) + 1);
    });

    els.pagination.addEventListener('click', function(event) {
        toggleCard(els.menuNavigation, 'left');
    });

    // Masquage des menus par un clic sur le reste de l'ihm
    els.masque.addEventListener('click', function(event) {
        const cardVisible = document.getElementsByClassName('toggle inside');
        if (cardVisible[0].classList.contains('inside--left')) {
            toggleCard(cardVisible[0], 'left');
        } else {
            toggleCard(cardVisible[0], 'right');
        }
    });

    // Mise à jour de la navigation en fonction des tests restant à valider
    verifierTests();

    // Initialisation des interactions des QCM et des questions
    initialisationQCM();
    initialisationQuestions();

    // Sélection de la diapo à afficher d'après l'url
    const url = new URL(window.location.href);

    // L'url pointe vers une diapo
    if (url.searchParams.get("page")) {
        // Si l'url pointe vers une diapo bloquée, affichage de la dernière diapo débloquée
        if (parseInt(url.searchParams.get("page")) <= maxDiapoAccessible + 1) {
            naviguer(parseInt(url.searchParams.get("page")) - 1);
        }
        // Affichage de la diapo mentionnée dans l'url
        else {
            naviguer(maxDiapoAccessible);
        }
    }
    // L'url ne mentionne pas de diapo, affichage de la diapo 0
    else {
        naviguer(0);
    }
    Prism.highlightAll();

    // Emission d'un événement "Mise en place du diaporama terminé"
    const evtDiapoPret = new CustomEvent('capcodeCoreDiaporama', {
        "bubbles": true,
        "cancelable": false
    });
    document.dispatchEvent(evtDiapoPret);
};


/* Construction de l'interface du diaporama dans le conteneur indiqué par l'utilisateur
 */
function construireInterface() {

    // Réinitialisation du <body>
    const contenuBody = document.body.innerHTML;
    while (document.body.lastElementChild) {
        document.body.removeChild(document.body.lastElementChild);
    }

    // Colonnes de l'interface
    els.colonneDiaporama = ajouterElement('div', document.body, {
        class: ['colonne-diaporama']
    });
    els.colonnePratique = ajouterElement('div', document.body, {
        class: ['colonne-pratique']
    });

    // Header et navigation
    els.headerDiaporama = ajouterElement('header', els.colonneDiaporama, {
        class: ['actions-diaporama', 'zone-actions']
    });

    // Bouton "Précédent"
    els.boutonPrecedent = ajouterElement('button', els.headerDiaporama, {
        class: ['btn', 'btn--default-light'],
        title: "Diapo précédente"
    });
    els.iBoutonPrecedent = ajouterElement('i', els.boutonPrecedent, {
        text: 'arrow_back',
        class: ['material-icons']
    });

    // Pagination
    els.pagination = ajouterElement('span', els.headerDiaporama, {
        class: ['pagination']
    });

    // Numéro de la diapo courante
    els.numDiapo = ajouterElement('span', els.pagination);

    // Slash
    els.slashPagination = document.createTextNode('/');
    els.pagination.appendChild(els.slashPagination);

    // Nombre total de diapos
    els.nbDiapo = ajouterElement('span', els.pagination);

    // Icône hamburger
    els.hamburger = ajouterElement('i', els.pagination, {
        text: 'menu',
        class: ['material-icons']
    });

    // Bouton "Suivant"
    els.boutonSuivant = ajouterElement('button', els.headerDiaporama, {
        class: ['btn', 'btn--default-light']
    });
    els.iBoutonSuivant = ajouterElement('i', els.boutonSuivant, {
        text: 'arrow_forward',
        class: ['material-icons']
    });

    // Menu de navigation
    els.menuNavigation = ajouterElement('div', document.body, {
        class: ['outside', 'outside--left', 'menu-navigation', 'card', 'toggle']
    });
    els.ulMenuNavigation = ajouterElement('ul', els.menuNavigation);

    // Cadre du diaporama
    els.zoneDiapo = ajouterElement('div', els.colonneDiaporama, {
        id: 'zone-diapo',
        class: ['zone-diapo', 'card']
    });

    // Zone d'action de la colonne de mise en pratique
    els.zoneActions = ajouterElement('div', els.colonnePratique, {
        id: 'zone-actions',
        class: ['zone-actions']
    });

    // Espace réservé à l'ajout d'actions personnalisées
    els.actionsTheme = ajouterElement('div', els.zoneActions, {
        id: 'actions-theme'
    });

    // Bouton "Plus d'actions"
    els.boutonPlus = ajouterElement('button', els.zoneActions, {
        id: 'bouton-plus',
        class: ['btn', 'btn--default-light'],
        title: "Plus d'actions"
    });
    // Icone du bouton plus
    els.iconeBoutonPlus = ajouterElement('i', els.boutonPlus, {
        class: ['material-icons'],
        text: 'more_vert'
    });
    // Menu d'actions supplémentaire
    els.menuPlus = ajouterElement('div', document.body, {
        class: ['outside', 'outside--right', 'card', 'toggle', 'menu-plus'],
        id: 'menu-plus'
    });
    els.ulMenuPlus = ajouterElement('ul', els.menuPlus, {
        id: 'liste-plus'
    });

    els.boutonPlus.addEventListener('click',function() {
         toggleCard(els.menuPlus, 'right');
    });
    els.menuPlus.addEventListener('click', function(event) {
        toggleCard(els.menuPlus, 'right');
    });

    // Zone d'action de la colonne de mise en pratique
    els.zonePratique = ajouterElement('div', els.colonnePratique, {
        id: 'zone-pratique',
        class: ['zone-pratique']
    });
    els.zonePratique.innerHTML = contenuBody;

    // Fond des modales
    els.masque = ajouterElement('div', document.body, {
        class: ['masque', 'absent']
    });

    // Emission d'un événement "Mise en place de l'interface terminée"
    const evtInterface = new CustomEvent('capcodeCoreInterface', {
        "bubbles": true,
        "cancelable": false
    });

    document.dispatchEvent(evtInterface);
}


// Navigation : affichage du nouveau contenu et mise à jour de l'historique navigateur
function naviguer(index) {
    // Mise à jour de l'historique du navigateur
    const arrUrl = window.location.pathname.split('/');
    history.pushState({
        diapo: index
    }, "titre", arrUrl[arrUrl.length - 1] + "?page=" + (index + 1));
    afficherDiapo(index);
}


// Affichage d'une nouvelle diapo
function afficherDiapo(index) {
    if (diapoVisible !== undefined) {
        diapoVisible.contenu.classList.remove('fade-in');
        diapoVisible.contenu.classList.add('fade-out');
        itemNavigationActif.classList.remove('active');

        // Suppression des classes générales appliquées à l'ensemble de la page et définies dans le fichier source
        if (params.bodyStyles[listeDiapos.indexOf(diapoVisible) + 1] !== undefined) {
            DOMTokenList.prototype.remove.apply(document.body.classList, params.bodyStyles[listeDiapos.indexOf(diapoVisible) + 1]);
        }
    }

    diapoVisible = listeDiapos[index];
    itemNavigationActif = els.ulMenuNavigation.children.item(index);
    diapoVisible.contenu.classList.remove('fade-out');
    diapoVisible.contenu.classList.add('fade-in');
    itemNavigationActif.classList.add('active');


    // Affichage des boutons de navigation
    els.numDiapo.innerHTML = index + 1;

    if (index === 0) { // Première diapo : Bouton "Précédent" masqué
        els.boutonPrecedent.classList.add('invisible');
    } else {
        els.boutonPrecedent.classList.remove('invisible');
    }

    if (index === listeDiapos.length - 1) { // Dernière diapo : Bouton "Suivant" masqué
        els.boutonSuivant.classList.add('invisible');
    } else {
        els.boutonSuivant.classList.remove('invisible');
    }

    if (index !== 0 && index !== listeDiapos.length - 1) { // Autres diapos, boutons "Précédent" et "Suivant" actifs
        els.boutonPrecedent.classList.remove('invisible');
        els.boutonSuivant.classList.remove('invisible');
    }

    // Désactivation des boutons "Suivant" et "Précédent"
    if (index < maxDiapoAccessible) {
        els.boutonSuivant.disabled = false;
        els.boutonSuivant.title = 'Diapo suivante'
        els.iBoutonSuivant.innerText = 'arrow_forward';
    } else {
        els.boutonSuivant.disabled = true;
        els.boutonSuivant.title = 'Réussissez le test proposé pour débloquer la suite du cours'
        els.iBoutonSuivant.innerText = 'lock';
    }

    // Ajout des classes générales appliquées à l'ensemble de la page et définies dans le fichier source
    if (params.bodyStyles[index + 1] !== undefined) {
        DOMTokenList.prototype.add.apply(document.body.classList, params.bodyStyles[index + 1]);
    }

    const evtChgtDiapo = new CustomEvent('capcodeCoreChgtDiapo', {
        detail: {
            index: index
        }
    });
    document.dispatchEvent(evtChgtDiapo);
}


/* Affichage ou masquage de la liste des diapos (menu de navigation)
 */
function toggleCard(el, direction) {
    el.classList.toggle('outside');
    el.classList.toggle('outside--' + direction);
    el.classList.toggle('inside');
    el.classList.toggle('inside--' + direction);
    els.masque.classList.toggle('absent');
}


/* Vérification des diapos bloquées du fait de tests non validées
 */
function verifierTests() {

    // Dévérouillage de la navigation après une évaluation complétée
    for (let i = 0; i < listeDiapos.length; i++) {
        activerLienNavigation(i); // Activation des liens du menu de navigation

        if (listeQuestionsAFaire['diapo' + (i + 1)].tests.length) {
            maxDiapoAccessible = i;
            break;
        }

        // Bouton "Continuer"
        const boutonContinuer = listeDiapos[i].contenu.querySelector(".bouton-continuer");
        boutonContinuer.disabled = false;
        boutonContinuer.addEventListener('click', function() {
            naviguer(listeDiapos.indexOf(diapoVisible) + 1);
        });

        // Bouton "Suivant"
        els.boutonSuivant.disabled = false;
    }
}


function activerLienNavigation(index) {
    const menuItem = els.ulMenuNavigation.children.item(index);

    if (menuItem.classList.contains('inactif')) {
        menuItem.classList.remove('inactif');
        menuItem.addEventListener('click', function() {
            toggleCard(els.menuNavigation, 'left');
            naviguer(index);
        });
    }
}

/* Gestion des QCM
 */
function initialisationQCM() {
    const listeQCM = Array.prototype.slice.call(els.zoneDiapo.querySelectorAll(".qcm"));


    listeQCM.forEach(function(question) {

        const listePropositionsReponses = Array.prototype.slice.call(question.querySelectorAll(".proposition-reponse"));

        // Modification de l'icone lors du clic sur une proposition de réponse
        function cocherCheckbox(event) {
            if (event.currentTarget.classList.contains('coche')) {
                event.currentTarget.classList.remove('coche');
                event.currentTarget.firstElementChild.innerText = 'check_box_outline_blank';
            } else {
                event.currentTarget.classList.add('coche');
                event.currentTarget.firstElementChild.innerText = 'check_box';
            }
        }

        listePropositionsReponses.forEach(function(proposition) {
            proposition.addEventListener('click', cocherCheckbox);
        });

        // Ajout du bouton "Réponse"
        const boutonReponse = ajouterElement('div', question, {
            text: 'Voir la réponse',
            class: ['bouton-reponse']
        });


        // Correction de la question
        boutonReponse.addEventListener("click", function(event) {
            // Affichage du texte de la réponse
            question.getElementsByClassName('reponse')[0].classList.remove('absent');

            // Masquage du bouton "Afficher la réponse"
            event.target.classList.add('absent');

            // Actualisation des checkbox
            listePropositionsReponses.forEach(function(proposition) {

                // Bonne réponse non cochée
                if (proposition.classList.contains('bonne-reponse')) {
                    proposition.classList.add('success');
                }
                // Désactivation du questionnaire après affichage de la réponse
                proposition.removeEventListener('click', cocherCheckbox);
            });
        });
    });
}

/* Gestion des questions : affichage des indices
 */
function initialisationQuestions() {
    listeDivQuestions = Array.prototype.slice.call(els.zoneDiapo.querySelectorAll('.test, .entrainement'));


    listeDivQuestions.forEach(function(question) {

        const listeIndices = Array.prototype.slice.call(question.querySelectorAll('.indice'));

        if (listeIndices.length) {
            // Ajout du bouton "Afficher un indice"
            const boutonIndice = ajouterElement('div', question, {
                text: 'Coup de pouce',
                class: ['bouton-indice']
            });

            // Affichage de l'indice
            boutonIndice.addEventListener("click", function(event) {
                // Affichage du texte de la réponse
                question.querySelector('.indice.absent').classList.remove('absent');

                // Masquage du bouton "Afficher un indice"
                if (!question.querySelector('.indice.absent')) {
                    event.target.classList.add('absent');
                }
            });
        }
    });
}

function updateCookie(progression, cookie) {
    localStorage.setItem(cookie, JSON.stringify(progression));
}

function ajouterContact(adresse) {
    els.liContact = ajouterElement('li', els.ulMenuPlus, { id:'li-contact'});
    ajouterElement('i', els.liContact, {
        class: ['material-icons'],
        text: 'mail_outline'
    });
    ajouterElement('a', els.liContact, {
        text: "Contacter l'auteur",
        href: 'mailto:'+ adresse
    });
}


function ajouterDocs(docs) {
    const docsArray = docs.split(',');

    els.liDocs = ajouterElement('li', els.ulMenuPlus, { id:'li-docs'});
    ajouterElement('i', els.liDocs, {
        class: ['material-icons'],
        text: 'insert_drive_file'
    });
    ajouterElement('a', els.liDocs, {
        text: "Documents",
        class: ['cliquable']
    });

    const divDocs = ajouterElement('div', document.body, { class: ['liste-docs', 'card', 'toggle', 'outside', 'outside--right']});
    const ulDocs = ajouterElement('ul', divDocs);

    docsArray.forEach(function(doc) {
        const regex = /\s*(\S[^\(]*)\s*\(([^\(]+)\)\s*/g;
        let match;
        while (match = regex.exec(doc)) {
            const liDoc = ajouterElement('li', ulDocs);
            ajouterElement('a', liDoc, {
                text: match[1],
                href: match[2],
                target: '_blank'
            });
        }
    });

    els.liDocs.addEventListener('click', function() {
        toggleCard(divDocs, 'right');
    });
}


/* EVENEMENTS
 * ---------------------------------------------------------------------------------------------- */
// Réception d'une bonne réponse à une question
document.addEventListener('capcodeCoreQuestionReussie', function(event) {
    const indexDiapo = event.detail.indexDiapo
    // Test bloquant
    if (event.detail.type == 'test') {
        if (listeQuestionsAFaire['diapo' + indexDiapo].tests.indexOf(event.detail.questionId) != -1) {
            listeQuestionsAFaire['diapo' + indexDiapo].tests.splice(listeQuestionsAFaire['diapo' + indexDiapo].tests.indexOf(event.detail.questionId), 1);

            const blocQuestion = document.getElementById('test-' + event.detail.questionId);
            blocQuestion.classList.add('reussi');
            blocQuestion.children[0].classList.add('pulse');

            if (listeQuestionsAFaire['diapo' + indexDiapo].tests.length === 1) {
                alertify.success('<p><strong>Bonne réponse :)</strong></p><p>Encore un dernier effort et vous pourrez continuer !</p>');
            } else if (listeQuestionsAFaire['diapo' + indexDiapo].tests.length) {
                alertify.success('<p><strong>Bonne réponse :)</strong></p><p>Encore ' + listeQuestionsAFaire['diapo' + indexDiapo].tests.length + ' solutions à trouver avant de pouvoir continuer.</p>');
            } else {
                alertify.success('<p><strong>Félicitations ;)</strong></p><p>Vous avez débloqué la suite du cours.</p>');
            }
            verifierTests();

            // Mise à jour de la progression
            progression.testsReussis.push(event.detail.questionId);
            updateCookie(progression, nomCookie);
        }
    }
    // Entrainement
    else if (event.detail.type == 'entrainement') {
        if (listeQuestionsAFaire['diapo' + indexDiapo].entrainements.indexOf(event.detail.questionId) != -1) {
            listeQuestionsAFaire['diapo' + indexDiapo].entrainements.splice(listeQuestionsAFaire['diapo' + indexDiapo].entrainements.indexOf(event.detail.questionId), 1);

            const blocEntrainement = document.getElementById('entrainement-' + event.detail.questionId);
            blocEntrainement.classList.add('reussi');
            blocEntrainement.children[0].classList.add('pulse');
            alertify.log('<p>Bonne réponse :)</p>');

            // Mise à jour de la progression
            progression.entrainementsReussis.push(event.detail.questionId);
            updateCookie(progression, nomCookie);
        }
    }
});

// Mise à jour de l'affichage lors de l'utilisation des boutons "Précédent" et "Suivant" du navigateur
window.addEventListener('popstate', function(event) {
    afficherDiapo(event.state.diapo);
});



/* MÉTHODES PUBLIQUES
 * ------------------------------------------------------------------------------------------ */

/* Construction du diaporama
 * @param options (Object) Liste des options :
 *                              path   -> Chemin vers le dossier contenant les sources markdown.
 *                              source -> Tableau de noms de fichiers markdown à utiliser.
 *                              cookie -> Nom du ookie de stockage de la progression
 */
function lancerDiaporama(options) {
    if (!options.hasOwnProperty('path')) {
        options.path = '';
    }
    if (!options.hasOwnProperty('cookie')) {
        options.cookie = 'inconnu';
    }

    setDiaporama(options.source, options.path, options.cookie);
}

module.exports = {
    lancerDiaporama,
    params
};
