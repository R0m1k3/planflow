# Audit des menus déroulants Combo

> Exploration authentifiée en lecture seule. Les options ont été relevées sans être sélectionnées. Les requêtes autres que GET/HEAD/OPTIONS ont été bloquées après authentification.

## Synthèse

- Routes demandées : **58**
- Routes auditées : **58**
- Déclencheurs candidats : **172**
- Menus ouverts et détectés : **51**
- Listes natives inspectées sans ouverture : **0**
- Requêtes non sûres bloquées : **2102**
- Erreurs de route : **0**

## `/`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/home`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/plannings/week`

### 1. 3 août - 9 août 2026

- Type : `button` / rôle `—` / `aria-haspopup=dialog`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`dialog`) :
  - août 2026
  - 27
  - 28
  - 29
  - 30
  - 31
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
  - 9
  - 10
  - 11
  - 12
  - 13
  - 14
  - 15
  - 16
  - 17
  - 18
  - 19
  - 20
  - 21
  - 22
  - 23
  - 24
  - 25
  - 26
  - Aujourd'hui
- Capture : [`03-ea89f06f0c.png`](screenshots/03-ea89f06f0c.png)
- Sécurité : 12 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Vue par employés

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Vue par jour
  - Vue par employés
  - Vue par étiquettes
  - Vue par mois
  - Vue des présences et absences
- Capture : [`03-0e3cfa45ad.png`](screenshots/03-0e3cfa45ad.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 3. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/plannings/day`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/plannings/labels`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/members`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Tous les rôles

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Tous les rôles
  - Propriétaire
  - Admin
  - Directeur
  - Manager
  - Employé
- Capture : [`06-24c766c882.png`](screenshots/06-24c766c882.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 3. Tous les types de contrats

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Tous les types de contrats
  - Apprentissage
  - CDD
  - CDI
  - Dirigeant assimilé salarié
  - Dirigeant non salarié
  - Extra
  - Intérim
  - Stagiaire
  - Saisonnier
- Capture : [`06-2b225dd581.png`](screenshots/06-2b225dd581.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/reports/payrolls`

### 1. Juillet

1 juil. 2026 - 31 juil. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **clicked_but_no_popup_detected**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Juin

1 juin 2026 - 30 juin 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 3. Mai

1 mai 2026 - 31 mai 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 4 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 4. Avril

1 avr. 2026 - 30 avr. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 5. Mars

1 mars 2026 - 31 mars 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 6. Février

1 févr. 2026 - 28 févr. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 4 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 7. Janvier

1 janv. 2026 - 31 janv. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 6 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 8. Décembre

1 déc. 2025 - 31 déc. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 9. Novembre

1 nov. 2025 - 30 nov. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 10. Octobre

1 oct. 2025 - 31 oct. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 11. Septembre

1 sept. 2025 - 30 sept. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 12. Août

1 août 2025 - 31 août 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 13. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 14. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 15. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 16. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Verrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-496a0bc8f8.png`](screenshots/07-496a0bc8f8.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 17. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-6600b666c3.png`](screenshots/07-6600b666c3.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 18. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-e7c5bc62ff.png`](screenshots/07-e7c5bc62ff.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 19. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-05e8558602.png`](screenshots/07-05e8558602.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 20. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-11a65121e5.png`](screenshots/07-11a65121e5.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 21. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-c0cf5aaaf4.png`](screenshots/07-c0cf5aaaf4.png)
- Sécurité : 4 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 22. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-0f5c5fb84e.png`](screenshots/07-0f5c5fb84e.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 23. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-b4cf41d529.png`](screenshots/07-b4cf41d529.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 24. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-b01097a770.png`](screenshots/07-b01097a770.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 25. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-ed8a05a66e.png`](screenshots/07-ed8a05a66e.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 26. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-05db1dbf62.png`](screenshots/07-05db1dbf62.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 27. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`07-4a3b740d10.png`](screenshots/07-4a3b740d10.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/reports/payrolls-history`

### 1. Juillet

1 juil. 2026 - 31 juil. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **clicked_but_no_popup_detected**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Juin

1 juin 2026 - 30 juin 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 3. Mai

1 mai 2026 - 31 mai 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 4. Avril

1 avr. 2026 - 30 avr. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 5. Mars

1 mars 2026 - 31 mars 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 6. Février

1 févr. 2026 - 28 févr. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 7. Janvier

1 janv. 2026 - 31 janv. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 8. Décembre

1 déc. 2025 - 31 déc. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 9. Novembre

1 nov. 2025 - 30 nov. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 10. Octobre

1 oct. 2025 - 31 oct. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 11. Septembre

1 sept. 2025 - 30 sept. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 12. Août

1 août 2025 - 31 août 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 13. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 14. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 15. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 16. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Verrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-c6eb0ddd60.png`](screenshots/08-c6eb0ddd60.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 17. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-0c122f2ae3.png`](screenshots/08-0c122f2ae3.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 18. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-554d29fd27.png`](screenshots/08-554d29fd27.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 19. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-52ab3487f1.png`](screenshots/08-52ab3487f1.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 20. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-b884c0d360.png`](screenshots/08-b884c0d360.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 21. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-83a4ad3909.png`](screenshots/08-83a4ad3909.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 22. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-7d894ca380.png`](screenshots/08-7d894ca380.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 23. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-b9c91fd367.png`](screenshots/08-b9c91fd367.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 24. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-42caff1ed5.png`](screenshots/08-42caff1ed5.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 25. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-47d57a34ab.png`](screenshots/08-47d57a34ab.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 26. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-89f5fee924.png`](screenshots/08-89f5fee924.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 27. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`08-fb0bcb078d.png`](screenshots/08-fb0bcb078d.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/reports/activities`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/reports/sick-leaves-status-report`

### 1. Juillet

1 juil. 2026 - 31 juil. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **clicked_but_no_popup_detected**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Juin

1 juin 2026 - 30 juin 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 13 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 3. Mai

1 mai 2026 - 31 mai 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 4. Avril

1 avr. 2026 - 30 avr. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 5. Mars

1 mars 2026 - 31 mars 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 6. Février

1 févr. 2026 - 28 févr. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 7. Janvier

1 janv. 2026 - 31 janv. 2026

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 8. Décembre

1 déc. 2025 - 31 déc. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 9. Novembre

1 nov. 2025 - 30 nov. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 10. Octobre

1 oct. 2025 - 31 oct. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 11. Septembre

1 sept. 2025 - 30 sept. 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 12. Août

1 août 2025 - 31 août 2025

Entrées

Sorties

Extras

CDI, CDD, Intérimaires, Apprentis Et Stagiaires

Actions
Exports

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 13. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 14. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 15. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 16. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Verrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-c819f8b968.png`](screenshots/10-c819f8b968.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 17. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-efc1b3da88.png`](screenshots/10-efc1b3da88.png)
- Sécurité : 4 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 18. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-b3e8d76068.png`](screenshots/10-b3e8d76068.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 19. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-4e0cc8067c.png`](screenshots/10-4e0cc8067c.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 20. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-73bddc2caa.png`](screenshots/10-73bddc2caa.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 21. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-6f7a851719.png`](screenshots/10-6f7a851719.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 22. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-03a5adfbfb.png`](screenshots/10-03a5adfbfb.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 23. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-09a6017397.png`](screenshots/10-09a6017397.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 24. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-14af76edec.png`](screenshots/10-14af76edec.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 25. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-bbbd5f4ba7.png`](screenshots/10-bbbd5f4ba7.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 26. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-c6f8da74db.png`](screenshots/10-c6f8da74db.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 27. Actions

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Déverrouiller la période de paie
  - Supprimer la période de paie
- Capture : [`10-9de2201393.png`](screenshots/10-9de2201393.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/reports/timeclock`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/home`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/incomplete-profiles`

### 1. Informations RUP et DPAE manquantes

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Informations RUP et DPAE manquantes
  - Informations RUP manquantes
  - Informations DPAE manquantes
- Capture : [`13-a8255e2914.png`](screenshots/13-a8255e2914.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/absence-log`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Toutes les absences

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Toutes les absences
  - Uniquement les absences Sécurité sociale
- Capture : [`14-5e19e47827.png`](screenshots/14-5e19e47827.png)
- Sécurité : 6 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/dashboard-rh/analytics/summary`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/analytics/absence`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/analytics/worked-hours`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/analytics/workforce`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/clock-in-out-follow-up`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/contracts-changes`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/document-signing`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Tous les statuts

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Échoué
  - En attente
  - En cours d'envoi
  - Expiré
  - Signé
  - Tous les statuts
- Capture : [`21-13eda71076.png`](screenshots/21-13eda71076.png)
- Sécurité : 15 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/dashboard-rh/entries`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/exits`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/paid-leaves`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/payslips`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/payslips/history`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/residence-permit`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/dashboard-rh/trial-end`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : RH, manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/timeoffs`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/timeoffs/calendar`

### 1. La Foir'Fouille

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/timeoffs/pending`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/timeoffs/treated`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/timeoffs/expired`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : manager ou administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/articles`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/conversations`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/electronic-signature`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : utilisateur authentifié; périmètre exact à confirmer avec d’autres rôles
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Établissements actifs

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Établissements actifs
  - Établissements archivés
- Capture : [`37-d1df84d39a.png`](screenshots/37-d1df84d39a.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/adp`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Établissements actifs

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Établissements actifs
  - Établissements archivés
- Capture : [`38-23464e136b.png`](screenshots/38-23464e136b.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/cash-register`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Établissements actifs

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Établissements actifs
  - Établissements archivés
- Capture : [`39-7af41f3b30.png`](screenshots/39-7af41f3b30.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/collective-agreement`

### 1. Règles de la convention collective

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **expanded_inline_control_not_dropdown**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 30 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Commerces de détail non alimentaires (IDCC 1517) - JF 50% et Dimanche 100%

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/contact`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/job-title`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 4. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 5. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 6. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 7. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 8. Edit job title

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/legal/rgpd`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/locations`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Établissements actifs

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Établissements actifs
  - Établissements archivés
- Capture : [`44-2f11769c95.png`](screenshots/44-2f11769c95.png)
- Sécurité : 13 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/marketplace`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Toutes les applications

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Toutes les applications
  - Caisse
  - Paie
  - RH
- Capture : [`45-daa67869ab.png`](screenshots/45-daa67869ab.png)
- Sécurité : 2 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/notification`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/pay-preferences`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/payroll-software`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Établissements actifs

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Établissements actifs
  - Établissements archivés
- Capture : [`48-ad77e6ec02.png`](screenshots/48-ad77e6ec02.png)
- Sécurité : 23 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/preferences`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/print`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/productivity`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/roles-permissions`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Établissements actifs

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Établissements actifs
  - Établissements archivés
- Capture : [`52-f8d58bf6cb.png`](screenshots/52-f8d58bf6cb.png)
- Sécurité : 16 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/subscription`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/template-documents`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Variables par établissement

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **clicked_but_no_popup_detected**; désactivé : **non**
- Contexte : filtre ou sélecteur de vue
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

## `/settings/timeclock`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/timeoff-policies`

### 1. action-dropdown-cell-button

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **interactive_dropdown_trigger**; désactivé : **non**
- Contexte : menu contextuel d’actions
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer
- Menu détecté (`listbox`) :
  - Assigner des employés
  - Archiver
- Capture : [`56-9696a56eb9.png`](screenshots/56-9696a56eb9.png)
- Sécurité : 3 requête(s) non sûre(s) bloquée(s) pendant l’ouverture.

### 2. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/settings/wage-ratio`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

## `/subscription`

### 1. Close banner

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 2. Page précédente

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **disabled_trigger**; désactivé : **oui**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

### 3. Page suivante

- Type : `button` / rôle `—` / `aria-haspopup=—`
- État : **unconfirmed_trigger_not_clicked**; désactivé : **non**
- Contexte : contrôle local de la page
- Rôle probable : administrateur probable
- Condition observée : visible dans l’état courant avec le compte audité; variantes conditionnelles à confirmer

