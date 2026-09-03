# Araignée — Schémas de raccordement éclairage

Application web pour novices : choisir le type de commande (interrupteurs ou télérupteur) et le nombre de points (1 à 4). Un schéma aux **vraies couleurs** + bornier Wago + dos des appareils est généré.

## Lancer

Ouvrir `index.html` dans le navigateur, ou depuis ce dossier :

```bash
python -m http.server 8765
```

Puis aller sur http://127.0.0.1:8765/

## Contenu

| Choix | Résultat |
|-------|----------|
| Interrupteurs × 1 | Interrupteur simple |
| Interrupteurs × 2 | Va-et-vient |
| Interrupteurs × 3 | Va-et-vient + permutateur |
| Interrupteurs × 4 | Va-et-vient + 2 permutateurs |
| Télérupteur × 1–4 | Poussoirs en parallèle + module au tableau |

Couleurs indicatives neuf : phase marron, neutre bleu, terre vert/jaune ; orange = retour lampe ; noir/gris/violet/rouge… = navettes ou commande.

**Sécurité :** couper le disjoncteur avant toute intervention. Guide visuel, pas une norme complète.
