import showdown from 'showdown';
import CodeMirror from 'codemirror';
import PerfectScrollbar from 'perfect-scrollbar';

import {
    ajouterElement,
    ajouterElementAvant,
    lireFichier,
    chargerFichier,
    enregistrerFichier
} from '../../core/js/capcode-utils';

import '../style/capcode-html.scss';

/* Les paramètres éventuellement passés dans le fichier markdown source sont accessibles via l'objet capcode.core.params */

const CONCEPTION = true;

let zoneDiapo,
    scrollbarDiapo,
    indexDiapo,
    editeurHtml,
    editeurCss,
    boutonGo,
    zoneEditeur,
    // Fenêtre de rendu
    outputWindow,
    outputWindowBody,           // Noeud `body` de la fenêtre de rendu
    outputWindowOpened = false, // Indicateur de fenêtre de rendu ouverte
    outputWindowCss;            // Feuille de style de la fenêtre de rendu

// Chargement de la page => initialisation de la coloration syntaxique dans le zone de saisies
document.addEventListener('capcodeCoreLoaded', function() {
    editeurHtml = CodeMirror.fromTextArea(document.getElementById("editeur-html"), {
        lineNumbers: true,
        theme: "capcode-light",
        lineWrapping: true,
        mode: "text/html",
        extraKeys: {
            'Ctrl-Enter': actualiser
        }
    });
    editeurHtml.setValue('<!-- Saissez ici le code HTML --> \n<p class="ma-classe">\n  Lorem ipsum\n</p>');

    editeurCss = CodeMirror.fromTextArea(document.getElementById("editeur-css"), {
        lineNumbers: true,
        theme: "capcode-light",
        lineWrapping: true,
        mode: "text/css",
        extraKeys: {
            'Ctrl-Enter': actualiser
        }
    });
    editeurCss.setValue('/* Saisissez ici le code CSS */ \n.ma-classe {\n  color: blue;\n}');

    // Saisie de HTML
    editeurHtml.on('change', event => {
        dispatchHtml();
    });

    // Saisie de CSS
    editeurCss.on('change', event => {
        dispatchCss();
    });
});

// Interface core en place => Finalisation de l'interface SQL
document.addEventListener('capcodeCoreInterface', function(event) {
    // Finalisation de l'interface (ajout de boutons spécifiques SQL...)
    const zoneActionsSQL = document.getElementById('actions-theme');

    // Bouton de sauvegarde de la saisie
    const imgLogo = ajouterElement('img', zoneActionsSQL, {
        class: ['logo'],
        src: 'assets/html/logo_caphtml.svg'
    });



    boutonGo = document.getElementById('bouton-go');
    zoneEditeur = document.getElementById('zone-editeur');

    /* EVENEMENTS
     * ---------------------------------------------------------------------------------------------- */
    // Boutons d'action "Go"
    boutonGo.addEventListener('click', actualiser);
    boutonGo.classList.add('absent');

    // A chaque changement de diapo, actualisation des scrollbars
    document.addEventListener('capcodeCoreChgtDiapo', function(event) {
        indexDiapo = event.detail.index;
        scrollbarDiapo.update();
    });

    // Mise à jour des scrollbars
    zoneDiapo = document.getElementById('zone-diapo');
    scrollbarDiapo = new PerfectScrollbar(zoneDiapo);
});


function actualiser() {
    console.log("Actualisation");

    outputWindow = window.open('html_output.html', "Capcode - Rendu HTML", "menubar=no, status=no, scrollbars=no, width=1024, height=768");
}

// ### Initialisation de la fenêtre de rendu

window.addEventListener('outputReady', event => {

    // Actualisation de l'indicateur
    outputWindowOpened = true;

    // Récupération du DOM et du CSS
    outputWindowBody = outputWindow.document.getElementById('body');
    outputWindowCss = outputWindow.document.styleSheets[0];

    // Chargement du HTML et du CSS
    dispatchHtml();
    dispatchCss();
});

// ### Actualisation du HTML

function dispatchHtml() {

    // Vers la fenêtre de rendu
    if (outputWindowOpened) {
        outputWindowBody.innerHTML = editeurHtml.getValue();
    }
}

// ### Actualisation du CSS

function dispatchCss() {

    // Vers la fenêtre de rendu
    if (outputWindowOpened) {
        updateCss(outputWindowCss);
    }
}

// Consitution de la feuille de styles à partir de la saisie

function updateCss(sheet) {

    // Consitution d'un tableau de règles CSS
    const arrRules = editeurCss.getValue().split('}'),
        nbRules = sheet.cssRules.length;

    // Effacement de la feuille de styles antérieure
    for (let i = 0; i < nbRules; i++) {
        sheet.deleteRule(0);
    }

    // Écriture de la nouvelle feuille de styles
    arrRules.forEach((rule, index) => {
        if (index != arrRules.length - 1) {
            sheet.insertRule(rule + '}', sheet.cssRules.length);
        }
    });
}
