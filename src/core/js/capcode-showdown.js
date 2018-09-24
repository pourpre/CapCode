/**
 * Showdown's Extension boilerplate
 *
 * A boilerplate from where you can easily build extensions
 * for showdown
 */
(function(extension) {
    'use strict';

    // UML - Universal Module Loader
    // This enables the extension to be loaded in different environments
    if (typeof showdown !== 'undefined') {
        // global (browser or nodejs global)
        extension(showdown);
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(['showdown'], extension);
    } else if (typeof exports === 'object') {
        // Node, CommonJS-like
        module.exports = extension(require('./lib/showdown.min'));
    } else {
        // showdown was not found so we throw
        throw Error('Could not find showdown library');
    }

}(function(showdown) {
    'use strict';

    //This is the extension code per se

    // Here you have a safe sandboxed environment where you can use "static code"
    // that is, code and data that is used accros instances of the extension itself
    // If you have regexes or some piece of calculation that is immutable
    // this is the best place to put them.

    // The following method will register the extension with showdown
    showdown.extension('capcode', function() {
        'use strict';

        // questionnaire à choix multiple
        var qcmExt = {
            type: 'lang',
            filter: function(text, converter) {

                let texte;

                function reponse(match, text1, offset, string) {
                    return '\n<div class="reponse absent">' + converter.makeHtml(text1.trim()) + '</div>';
                }

                function checkbox(match, coche, solution, offset, string) {
                    const rep = coche.length !== 0 ? 'bonne-reponse' : '';
                    return '\n<div class="proposition-reponse ' + rep + '"><i class="material-icons">check_box_outline_blank</i>' + solution + '</div>';
                }

                function question(match, text1, offset, string) {
                    texte = text1.replace(/\n\s*\[(x?)\](.*)/ig, checkbox);
                    texte = texte.replace(/\n\s*=>\s*(.*)/g, reponse);

                    return '<div class="question qcm"><h3>Quizz</h3>' + converter.makeHtml(texte) + '</div>';
                }

                texte = text.replace(/\n\s*\?{3}\s*qcm\s*\n((?:(?!\?{3})[\s\S])+)\?{3}/gi, question);
                return texte;
            }
        };

        // Travaux pratiques bloquants
        var evalExt = {
            type: 'lang',
            filter: function(text, converter) {

                let texte;

                function indice(match, text1, offset, string) {
                    return '\n<div class="indice absent">' + converter.makeHtml(text1.trim()) + '</div>';
                }

                function question(match, text1, text2, text3, offset, string) {
                    texte = text3.replace(/\n\s*=>\s*(.*)/g, indice);

                    if (text1 == 'test') {
                        return '<div id="test-' + text2 + '" class="question test"><h3>Challenge</h3>' + converter.makeHtml(texte) + '</div>';
                    } else {
                        return '<div id="entrainement-' + text2 + '" class="question entrainement"><h3>Exercice</h3>' + converter.makeHtml(texte) + '</div>';
                    }

                }

                texte = text.replace(/\n\s*\?{3}\s*(test|entrainement)\s*:\s*(\S+)\n((?:(?!\?{3})[\s\S])+)\?{3}/gi, question);
                return texte;
            }
        };

        return [qcmExt, evalExt];
    });
}));
