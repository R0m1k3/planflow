# Données de démonstration

**Entièrement fictives.** Aucune donnée réelle de salarié ne doit entrer ici :
ce répertoire est versionné, lisible par tous, et n'offre aucune des garanties
que `PLAN.md` §3.6 exige pour un dossier RH — chiffrement au repos,
journalisation des accès, durées de conservation.

Ce module existe parce que les écrans ont été construits avant WP-01 (tenancy,
identité, base de données). Il tient la forme des données pour que la mise en
page soit réelle plutôt que devinée.

**Remplacement.** Chaque écran importe depuis `@/lib/demo/...` et rien d'autre.
Au fil des lots, ces imports sont remplacés un à un par des requêtes serveur
scopées. Le jour où le répertoire disparaît, il ne reste rien à nettoyer
ailleurs : c'est la seule raison pour laquelle il est isolé plutôt que dispersé
dans les composants.
