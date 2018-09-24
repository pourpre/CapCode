/* UTILITAIRES
 * Manipulation de fichiers, du DOM...
 * ------------------------------------------------------------------------------------------ */

 function creerElement(type, options = {}) {
     const element = document.createElement(type);

     if (options.hasOwnProperty('id')) { // ID de l'élément
         element.id = options.id;
     }

     if (options.hasOwnProperty('text')) { // Texte de l'élément
         element.innerText = options.text;
     }

     if (options.hasOwnProperty('class')) { // Classes attribuées
         DOMTokenList.prototype.add.apply(element.classList, options.class);
     }

     if (options.hasOwnProperty('type')) { // type de l'élément input
         element.type = options.type;
     }

     if (options.hasOwnProperty('disabled')) { // Attribut DISABLED
         element.disabled = options.disabled;
     }

     if (options.hasOwnProperty('for')) { // Association des labels à leurs inputs
         element.htmlFor = options.for;
     }

     if (options.hasOwnProperty('src')) { // Attribut src
         element.src = options.src;
     }

     if (options.hasOwnProperty('href')) { // Attribut href
         element.href = options.href;
     }

     if (options.hasOwnProperty('title')) { // Attribut title
         element.title = options.title;
     }

     if (options.hasOwnProperty('target')) { // Attribut target
         element.target = options.target;
     }

     return element;
 }

/* Fonction générique d'ajout d'un élément d'interface
 *
 * @param type (string) Type d'élément à insérer
 * @param parent (Element) Conteneur de l'élément créé
 * @param options (Object) Liste des options - 'id' : ID de l'élément créé, 'text' : contenu texte,
 *                                             'class' : tableau de classes à attribuer à l'élément,
 *                                             'disabled' : valeur de l'attribut DISABLED de l'élément
 */
export function ajouterElement(type, parent, options = {}) {
    const nouvelElement = creerElement(type, options);
    parent.appendChild(nouvelElement);
    return nouvelElement;
}

export function ajouterElementAvant(type, parent, reference, options = {}) {
    const nouvelElement = creerElement(type, options);
    parent.appendChild(nouvelElement, reference);
    return nouvelElement;
}

// Chargement du contenu d'un fichier à partir de son adresse
export function chargerFichier(source, callback) {
    var f = new XMLHttpRequest();
    f.open('GET', source, false);
    f.overrideMimeType('text/plain');
    f.onreadystatechange = function() {
        if (f.readyState === 4) {
            if (f.status === 200 || f.status === 0) {
                callback(f.response);
            }
        }
    };
    f.send();
}

// Lecture d'un fichier
export function lireFichier(fichier, callback) {
    var fileReader = new FileReader();
    fileReader.onload = function(event) {
        callback(event.target.result);
    };

    fileReader.readAsText(fichier, "UTF-8");
}

// Enregistrement
export function enregistrerFichier(data, filename, type) {
    var file = new Blob([data], {
        type: type
    });
    if (window.navigator.msSaveOrOpenBlob) { // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    } else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}
