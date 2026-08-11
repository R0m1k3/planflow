-- ---------------------------------------------------------------------------
-- Nature d'envoi distincte pour l'affectation d'un créneau.
--
-- Réutiliser PLANNING_PUBLISHED aurait rendu le journal d'envois illisible : le
-- jour où un salarié affirme n'avoir pas été prévenu, il faut pouvoir
-- distinguer « la semaine a été publiée » de « un créneau a été ajouté après
-- coup ».
--
-- Dans sa propre migration : PostgreSQL refuse qu'une valeur d'énumération soit
-- ajoutée puis employée dans la même transaction. Les séparer évite d'avoir à
-- s'en souvenir le jour où la migration suivante voudra s'en servir.
-- ---------------------------------------------------------------------------

ALTER TYPE "EmailKind" ADD VALUE IF NOT EXISTS 'SHIFT_ASSIGNED';
