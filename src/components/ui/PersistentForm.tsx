'use client';

import { useEffect, useRef, type FormHTMLAttributes, type ReactNode } from 'react';

/**
 * Un formulaire qui ne perd pas la saisie quand le serveur refuse.
 *
 * React 19 **vide les champs non contrôlés dès que l'action se termine**, sans
 * distinguer le succès de l'échec. Sur un refus, l'utilisateur retrouve donc un
 * formulaire vierge et doit tout ressaisir — sur l'écran de première
 * installation, huit champs pour un mot de passe trop court.
 *
 * Pire que l'agacement : les champs vidés portent `required`, si bien que le
 * clic suivant est arrêté par la validation du navigateur **avant** d'émettre
 * un `submit`. Le formulaire paraît alors mort — le bouton répond, et rien ne
 * part.
 *
 * Le remède : photographier la saisie à l'envoi, et la rétablir quand React
 * remet le formulaire à zéro. Les mots de passe sont exclus de la photo — les
 * réécrire dans le document les exposerait au cache de la page et à toute
 * extension qui la lit.
 */

export interface PersistentFormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'action'> {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
}

/**
 * Le rétablissement est **inconditionnel**, et ce n'est pas un raccourci.
 *
 * Le distinguer selon l'issue supposerait de lire l'état de l'action au moment
 * de la remise à zéro. Or React remet le formulaire à zéro pendant la
 * validation du rendu, tandis qu'un `useEffect` s'exécute après : le drapeau lu
 * serait celui de l'envoi précédent, et le premier refus perdrait la saisie —
 * exactement le défaut qu'on corrige. Mieux vaut ne pas dépendre de cet ordre.
 *
 * Un formulaire qui doit se vider après un envoi réussi le fait donc lui-même.
 * La règle par défaut est la bonne : ne jamais perdre ce que l'utilisateur a
 * tapé.
 */
export function PersistentForm({
  action,
  children,
  ...rest
}: PersistentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const snapshot = useRef<Array<[string, string]> | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const restorable = (element: Element): element is HTMLInputElement =>
      element instanceof HTMLInputElement &&
      Boolean(element.name) &&
      // Un mot de passe ne se réécrit pas dans le document.
      element.type !== 'password' &&
      // Cases et boutons radio : leur état vit dans `checked`, pas dans
      // `value`, et le rétablir demanderait de photographier autre chose.
      element.type !== 'checkbox' &&
      element.type !== 'radio' &&
      // Les champs internes des actions serveur portent un nom en `$ACTION_`.
      // Les toucher défairait le câblage de l'action elle-même.
      !element.name.startsWith('$');

    const capture = () => {
      snapshot.current = [...form.elements]
        .filter(restorable)
        .map((field) => [field.name, field.value]);
    };

    const rewrite = () => {
      const captured = snapshot.current;
      if (!captured) return;

      // Après la remise à zéro, pas pendant : l'événement `reset` précède
      // l'effacement, et écrire ici serait aussitôt défait.
      queueMicrotask(() => {
        for (const [name, value] of captured) {
          const field = form.elements.namedItem(name);
          if (field instanceof Element && restorable(field)) {
            field.value = value;
          }
        }
      });
    };

    form.addEventListener('submit', capture);
    form.addEventListener('reset', rewrite);
    return () => {
      form.removeEventListener('submit', capture);
      form.removeEventListener('reset', rewrite);
    };
  }, []);

  return (
    <form ref={formRef} action={action} {...rest}>
      {children}
    </form>
  );
}
