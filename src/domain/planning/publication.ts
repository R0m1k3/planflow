/**
 * Intention portée par le bouton qui publie ou dépublie une semaine.
 *
 * Dans le domaine, et non auprès de l'action : un module `'use server'` ne peut
 * exporter que des fonctions asynchrones, et y placer une constante vide le
 * module de tous ses exports — l'erreur se lit alors « The module has no
 * exports at all », loin de sa cause.
 *
 * Pourquoi une intention plutôt que deux actions : passer tantôt l'une tantôt
 * l'autre à `useActionState` selon l'état paraît naturel et ne fonctionne pas.
 * Le formulaire cesse de suivre le changement d'action, et un bouton
 * « Dépublier » finit par republier — sans message d'erreur, puisque l'action
 * réellement exécutée réussit. Voir `setWeekPublicationAction`.
 */

export const PUBLISH_INTENT = 'publier';
export const UNPUBLISH_INTENT = 'depublier';

/** Nom du champ qui porte l'intention dans le formulaire. */
export const PUBLICATION_INTENT_FIELD = 'intention';
