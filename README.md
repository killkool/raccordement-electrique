# Araignée — Schémas de raccordement éclairage

Application web pour novices : choisir le type de commande (interrupteurs ou télérupteur) et le nombre de points (1 à 4). Un schéma aux **vraies couleurs** + bornier Wago + dos des appareils est généré.

Le mode par défaut **Chambres indépendantes** présente 4 chambres, avec 1 lampe et 1 interrupteur simple chacune. Le nombre de chambres est réglable de 1 à 4. Chaque retour R1…R4 est un groupe électrique distinct, même si tous sont orange : une borne à 2 entrées par retour, plus les trois distributions communes (phase, neutre, terre) du même circuit. Pour 4 chambres : 3 bornes à 5 entrées et 4 bornes à 2 entrées. Les commandes sont indépendantes, la protection reste commune.

La vue d’ensemble est organisée en cartes par chambre (ou par appareil en mode couloir), avec des fils verticaux sans croisement. La boîte affiche une ligne par bornier : chaque départ du même groupe est nommé, et les retours restent sur des lignes séparées. Une liste repère les gaines et leurs conducteurs ; les consignes détaillées des bornes se déplient sous le schéma. Ces vues s’adaptent aux petits écrans.

Les appareils et les listes de matériel utilisent les mêmes groupes électriques. Les conducteurs orange sont montrés sous gaine ; dans un câble 3G vers une lampe, repérer le marron utilisé comme retour.

Principe vérifié avec [Legrand — branchement d’un interrupteur](https://www.legrand.fr/questions-frequentes/comment-faire-un-branchement-electrique-dinterrupteur). Avant intervention : mise hors tension, prévention de la remise sous tension et vérification d’absence de tension avec un appareil adapté. Faire vérifier l’installation réelle.

Deux onglets permettent de basculer entre **Vue organisée** (cartes et borniers en lignes) et **Vue classique** (parcours des fils, boîte ouverte et étoile), sans changer le type de commande ni le nombre de lampes. Le format reste sélectionné lors des changements de configuration. Les flèches gauche/droite permettent aussi de changer d’onglet au clavier.

## Lancer

Ouvrir `index.html` dans le navigateur, ou depuis ce dossier :

```bash
python -m http.server 8765
```

Puis aller sur http://127.0.0.1:8765/

## Contenu

| Choix | Résultat |
|-------|----------|
| Chambres indépendantes × 1–4 | Un interrupteur et un retour séparé pour chaque lampe |
| Interrupteurs × 1 | Interrupteur simple |
| Interrupteurs × 2 | Va-et-vient |
| Interrupteurs × 3 | Va-et-vient + permutateur |
| Interrupteurs × 4 | Va-et-vient + 2 permutateurs |
| Télérupteur × 1–4 | Poussoirs en parallèle + module au tableau |

Couleurs indicatives neuf : phase marron, neutre bleu, terre vert/jaune ; orange = retour lampe ; noir/gris/violet/rouge… = navettes ou commande.

**Sécurité :** couper le disjoncteur avant toute intervention. Guide visuel, pas une norme complète.
