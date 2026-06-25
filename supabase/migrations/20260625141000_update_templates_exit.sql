UPDATE checklist_item_templates SET label = REPLACE(label, 'Google', 'Microsoft'), description = REPLACE(description, 'Google', 'Microsoft') WHERE label LIKE '%Google%' OR description LIKE '%Google%';
DELETE FROM checklist_item_templates WHERE phase = 'exit';
INSERT INTO checklist_item_templates (phase, category, label, description, is_document, is_conditional, condition_label, headquarters_only, is_required, order_index, hr_only) VALUES
  ('exit','administrative','Plan des compétences', 'Barrer (ou supprimer si pas de formation) le nom du collaborateur', false, false, null, false, true, 10, false),
  ('exit','administrative','Drive', 'Mettre le dossier du collaborateur dans le dossier sorties', false, false, null, false, true, 20, false),
  ('exit','health','Sortir le collab des effectifs auprès de la médecine du travail', null, false, false, null, false, true, 30, false),
  ('exit','compliance','Si travailleur étranger : mettre à jour la liste', null, false, true, 'Travailleur étranger', false, true, 40, false),
  ('exit','it','Boond Manager : mettre le collab en sortie', null, false, false, null, false, true, 50, false),
  ('exit','it','Désactiver le compte boond manager', null, false, false, null, false, true, 60, false),
  ('exit','it','Supprimer/Suspendre le compte Microsoft', 'Supprimer (hors siège) ou suspendre (siège)', false, false, null, false, true, 70, false),
  ('exit','it','Rénitialiser le matériel informatique', null, false, false, null, false, true, 80, false),
  ('exit','it','Mettre à jour GLPI', null, false, false, null, false, true, 90, false),
  ('exit','it','Supprimer du listing des mails', null, false, false, null, false, true, 100, false),
  ('exit','it','Mettre en place transfert mail au manager', null, false, false, null, false, true, 110, false),
  ('exit','it','Date pour la suppression compte microsoft', null, false, false, null, false, true, 120, false),
  ('exit','it','Supprimer le compte microsoft', null, false, false, null, false, true, 130, false);
