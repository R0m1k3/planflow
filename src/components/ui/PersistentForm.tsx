'use client';

import { useEffect, useRef, type FormHTMLAttributes, type ReactNode } from 'react';

/**
 * Un formulaire qui ne perd pas la saisie quand le serveur refuse.
 *
 * React 19 **vide les champs non contrôlés dès que l'action se termine**, sans
 * distinguer le succès de l'échec. Sur un refus, l'utilisateur retrouve donc un
 * formulaire vierge et doit tout ressaisir.
 *
 * Pire que l'agacement : les champs vidés portent `required`, si bien que le
 * clic suivant est arrêté par la validation du navigateur **avant** d'émettre
 * un `submit`. Le formulaire paraît alors mort — le bouton répond, et rien ne
 * part. Il faut ressaisir *tous* les champs requis pour qu'un second envoi
 * puisse seulement atteindre le serveur.
 *
 * Le remède : photographier la saisie à l'envoi, et la rétablir quand React
 * remet le formulaire à zéro. Les mots de passe sont exclus de la photo — les
 * réécrire dans le document les exposerait au cache de la page et à toute
 * extension qui la lit.
 */

type Restorable =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

interface Captured {
  name: string;
  value: string;
  checked: boolean;
  /** Sélection multiple : `value` seul ne la décrirait pas. */
  selected?: string[];
}

export interface PersistentFormProps
  extends Omit<FormHTMLAttributes<HTMLFormElement>, 'action'> {
  action: (formData: FormData) => void | Promise<void>;
  /**
   * À passer quand l'envoi a **réussi** — typiquement l'état retourné par
   * l'action, ou `null` en cas de refus.
   *
   * Le formulaire revient alors à ses valeurs par défaut, c'est-à-dire à ce que
   * le serveur vient de rendre : vide pour un formulaire d'ajout, et la valeur
   * enregistrée pour un champ d'édition. C'est ce qui rend visible une
   * normalisation faite côté serveur, qu'un rétablissement de la frappe
   * masquerait.
   *
   * Passer l'état lui-même plutôt qu'un booléen n'est pas un détail :
   * `useActionState` en produit un nouveau à chaque envoi, si bien que deux
   * succès consécutifs sont distingués — ce qu'un `true` répété ne permettrait
   * pas.
   *
   * Omis, le formulaire garde la saisie : c'est le bon défaut pour un écran
   * dont le succès mène ailleurs.
   */
  resetAfter?: unknown;
  children: ReactNode;
}

function restorable(element: unknown): element is Restorable {
  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLSelectElement) &&
    !(element instanceof HTMLTextAreaElement)
  ) {
    return false;
  }
  // Les champs internes des actions serveur portent un nom en `$ACTION_` : les
  // toucher défairait le câblage de l'action elle-même.
  if (!element.name || element.name.startsWith('$')) return false;
  if (element instanceof HTMLInputElement) {
    // Un mot de passe ne se réécrit pas dans le document.
    if (element.type === 'password') return false;
    // Un champ fichier n'est pas assignable par script, et c'est heureux.
    if (element.type === 'file') return false;
    // Un champ caché ne porte jamais une saisie : il porte l'état de
    // l'application — identifiants, jetons, numéros de version. Le rétablir
    // écraserait ce que le serveur vient de renvoyer.
    //
    // Le cas s'est produit : le formulaire de publication d'une semaine porte
    // un `expectedVersion`, verrou optimiste relu à chaque rendu. Rétabli
    // depuis la photo, il renvoyait la version d'avant la publication, et la
    // dépublication qui suivait était refusée pour conflit.
    if (element.type === 'hidden') return false;
  }
  return true;
}

/**
 * Le rétablissement est **inconditionnel**, et ce n'est pas un raccourci.
 *
 * Le conditionner à l'issue supposerait de lire l'état de l'action au moment de
 * la remise à zéro. Or React remet le formulaire à zéro pendant la validation
 * du rendu, tandis qu'un `useEffect` s'exécute après : le drapeau lu serait
 * celui de l'envoi précédent, et le premier refus perdrait la saisie —
 * exactement le défaut qu'on corrige. Le vidage après succès passe donc par un
 * effet, qui s'exécute *après* le rétablissement et le défait proprement.
 */
export function PersistentForm({
  action,
  resetAfter,
  children,
  ...rest
}: PersistentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const snapshot = useRef<Captured[] | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const capture = () => {
      snapshot.current = [...form.elements].filter(restorable).map((field) => ({
        name: field.name,
        value: field.value,
        checked: field instanceof HTMLInputElement ? field.checked : false,
        ...(field instanceof HTMLSelectElement && field.multiple
          ? { selected: [...field.selectedOptions].map((o) => o.value) }
          : {}),
      }));
    };

    const rewrite = () => {
      const captured = snapshot.current;
      if (!captured) return;

      // Après la remise à zéro, pas pendant : l'événement `reset` précède
      // l'effacement, et écrire ici serait aussitôt défait.
      queueMicrotask(() => {
        for (const entry of captured) {
          const field = form.elements.namedItem(entry.name);
          if (!restorable(field)) continue;

          if (
            field instanceof HTMLInputElement &&
            (field.type === 'checkbox' || field.type === 'radio')
          ) {
            field.checked = entry.checked;
          } else if (field instanceof HTMLSelectElement && entry.selected) {
            for (const option of field.options) {
              option.selected = entry.selected.includes(option.value);
            }
          } else {
            field.value = entry.value;
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

  useEffect(() => {
    if (!resetAfter) return;
    const form = formRef.current;
    if (!form) return;

    // La photo est jetée d'abord : sans cela, la remise à zéro déclencherait le
    // rétablissement de ce qu'on cherche justement à écarter.
    snapshot.current = null;
    form.reset();
  }, [resetAfter]);

  return (
    <form ref={formRef} action={action} {...rest}>
      {children}
    </form>
  );
}
