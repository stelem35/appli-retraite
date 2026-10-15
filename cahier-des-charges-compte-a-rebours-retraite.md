# Projet : Compte à rebours retraite (PWA)

## Objectif
Un tableau de bord personnel pour suivre ma préparation à la retraite : compte à rebours, chiffres clés recopiés depuis Mon compte retraite, comparaison de scénarios, jalons et rappels dans Google Agenda.

L'app **ne remplace pas** Mon compte retraite (source officielle) et ne calcule pas ma pension : je saisis les chiffres que mon relevé ou mes simulations m'indiquent.

## Situation de départ
- Date de départ indiquée sur Mon compte retraite : **01/01/2030**.
- Pas de projet freelance.
- Scénario probable avant le départ : **passage à 4/5e** avec **90 % du salaire** complété par une avance sur retraite. **Conditions à confirmer d'ici fin 2026** (auprès de l'employeur et des organismes de retraite).
- Ne jamais coder de règles de calcul en dur : elles changent, tout est saisi à la main avec une date de mise à jour.

## Fonctions

### 1. Compte à rebours
- Jours, mois et années restants avant la date de départ choisie (par défaut 01/01/2030).
- Jauge de progression depuis une date de début que je renseigne.
- Possibilité de changer la date de référence selon le scénario.

### 2. Fiche "mes chiffres clés" (saisie manuelle)
- Trimestres validés, trimestres requis, âge légal indiqué par mon relevé.
- Pension estimée (brute et nette si indiquée), date de la simulation.
- Date de dernière vérification du relevé de carrière.
- Chaque valeur a une date de mise à jour, et l'app signale quand elle a plus d'un an.

### 3. Scénarios comparés
- **Scénario A : départ à la date indiquée** (01/01/2030).
- **Scénario B : passage à 4/5e puis départ**, avec date de début du 4/5e, salaire visé (90 %), montant de l'avance sur retraite, impact éventuel sur la pension finale.
- Affichage côte à côte : date, revenu mensuel pendant la période, pension estimée, écart.
- Champs libres pour noter les hypothèses.

### 4. Suivi des conditions à confirmer (scénario B)
Liste de points à valider d'ici fin 2026, chacun avec statut (à faire, en cours, confirmé), interlocuteur, date, réponse obtenue :
- conditions d'accès au 4/5e (employeur, ancienneté, délai de prévenance),
- niveau réel du complément de salaire (90 %) et sa durée,
- fonctionnement de l'avance sur retraite et son remboursement éventuel,
- impact sur la pension de base et complémentaire,
- impact sur le préavis et sur la date de départ,
- documents à fournir.
Une échéance Google Agenda est créée pour chaque point avec date limite.

### 5. Jalons et rappels Google Agenda
- Revue du relevé de carrière (chaque année).
- Refaire une simulation sur Mon compte retraite (chaque année).
- Échéance "conditions du 4/5e confirmées" : décembre 2026.
- Demande de retraite : délai à confirmer avec mon relevé (environ 6 mois avant le départ).
- Rappels personnalisables, ajoutés ou modifiés depuis l'app.

### 6. Checklist des démarches
Cases à cocher : régimes à contacter, retraite complémentaire, documents à réunir, démarches employeur. Modifiable.

### 7. Journal des simulations
Date, pension estimée, hypothèse, remarque. Courbe simple de l'évolution d'une simulation à l'autre.

## Écrans
1. Accueil : compte à rebours, prochaines échéances, état des conditions du 4/5e.
2. Chiffres clés.
3. Scénarios (comparaison A / B).
4. Conditions à confirmer.
5. Checklist et journal.

## Technique
- PWA installable (iPhone et Android), hébergement Netlify.
- Rappels via l'API Google Calendar (connexion OAuth, à réutiliser depuis l'agenda perso).
- Stockage : local sur l'appareil avec export/import JSON, ou Supabase (plan gratuit) si je veux la synchro PC et téléphone. Me poser la question au démarrage.
- Aucune connexion à Mon compte retraite.

## Confidentialité
- Uniquement des dates et des montants que je saisis.
- Aucun numéro de sécurité sociale, aucun identifiant.
- Si Supabase est choisi : connexion sécurisée, compte unique, règles de sécurité activées.

## Premier livrable (MVP)
1. Compte à rebours avec la date du 01/01/2030.
2. Fiche des chiffres clés avec dates de mise à jour.
3. Scénarios A et B comparés.
4. Suivi des conditions à confirmer avec rappels Google Agenda (échéance décembre 2026).

## Plus tard
Journal des simulations avec courbe, checklist détaillée, affichage des jalons dans l'agenda perso.

## Consignes pour Claude Code
- Pose-moi les questions utiles avant de coder, puis avance étape par étape avec des explications claires.
- Commence par le MVP et teste sur mobile avant d'ajouter des fonctions.
- Ne jamais afficher un calcul comme officiel : toujours rappeler que les chiffres viennent de mes saisies.
