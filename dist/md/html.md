<!--
@contact : yann@exemple.fr
@diapo-avec-style-saisie-masquee : 1, 2
@doc : Exemple de document (doc/sql/document.pdf), Logo (doc/sql/pourpre.jpg)
-->

Ce diaporama est produit automatiquement à partir du fichier `md/html.md`.

Le fichier source est écrit en [markdown](https://daringfireball.net/projects/markdown/syntax) étendu (voir les règles sur [github](https://help.github.com/articles/basic-writing-and-formatting-syntax/)). Les formats de base ont été complété de blocs permettant d'insérer des QCM ou des exercices éventuellement bloquants pour accéder à la suite du cours.

Par ailleurs, il est possible de paramétrer d'ajouter des styles personnalisés aux pages, des documents annexés ou des emails de contact via les commentaires du fichiers source

# Titre principal

Exemple de texte.

---

Le markdown permet nativement pour afficher du code en ligne (`<p>Wow !</p>`) ou en bloc, le diaporama prévoit une coloration syntaxique automatique grâce à prism.js :

```html
<!-- C'est vraiment de la balle :) -->
<h1>Voici un peu de code</h1>
<p>Et en plus, il s'affiche de toutes les couleurs !</p>
```

??? qcm
Question

[]  Réponse 1
[x] Réponse 2
[]  Réponse 3

=> Ici, une petite explication pour compléter l'affichage de la bonne réponse.
???

## Diapo 3

Cette page affiche un style différent de la précédente grâce aux paramétrage passé en commentaire dans le fichier markdown source (en fait, ce sont les deux pages précédentes qui ne respectent pas le style par défaut).

La coloration syntaxique à la volée dans les zones de saisie est assurée par [codemirror](https://codemirror.net/).

### Titre 3

#### Titre 4

##### Titre 5

Le succès au tests ci-dessous est mémorisé via `localStorage` (le nom du cookie est un paramètre d'appel de la fonction de construction du diaporama, voir le fichier source HTML). Pour réinitialiser l'historique pour ce domaine, passer la commande `localStorage.clear()` dans la console du navigateur (sous Firefox : Ctrl+I).

??? entrainement : Entrainement_1
Voici un exercice, pour le valider, il convient de saisir la requête "SELECT nom FROM personnes;"

=> 1er indice
=> 2e indice
???

??? test : Test_1
Voici un test, pour le valider et débloquer la navigation, il convient de saisir la requête "SELECT * FROM personnes;"
???

## Diapo 4
bla
??? qcm
Question

[]  Réponse 1
[x] Réponse 2
[]  Réponse 3

=> Réponse
???

??? test : Question_2
2e evaluation
=> 1er indice
=> 2e indice
=> 3e indice
???
