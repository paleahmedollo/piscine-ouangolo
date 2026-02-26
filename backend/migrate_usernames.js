/**
 * Script de migration des noms d'utilisateurs
 * - Met le code de la Piscine de Ouangolo à "pmdo"
 * - Renomme tous les comptes _po en .pmdo
 * - Met le code de la société Franck à "pawe"
 * - Renomme palefranck en palefranck.pawe
 *
 * Usage : node migrate_usernames.js
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function migrate() {
  console.log('🚀 Démarrage migration usernames...\n');

  // 1. Afficher l'état actuel des entreprises
  const [companies] = await sequelize.query(
    `SELECT id, name, code, manager_name, locality, country FROM companies ORDER BY id`
  );
  console.log('📋 Entreprises actuelles :');
  companies.forEach(c => {
    console.log(`  #${c.id} | code="${c.code}" | nom="${c.name}" | fondateur="${c.manager_name || '-'}" | ville="${c.locality || '-'}"`);
  });
  console.log('');

  // 2. Afficher l'état actuel des utilisateurs
  const [users] = await sequelize.query(
    `SELECT id, username, full_name, role, company_id FROM users ORDER BY id`
  );
  console.log('👤 Utilisateurs actuels :');
  users.forEach(u => {
    console.log(`  #${u.id} | ${u.username} | ${u.role} | company_id=${u.company_id}`);
  });
  console.log('');

  // ──────────────────────────────────────────────
  // 3. Mettre le code de la 1ère entreprise (Piscine de Ouangolo) → "pmdo"
  // ──────────────────────────────────────────────
  const piscine = companies.find(c =>
    c.name.toLowerCase().includes('ouangolo') || c.name.toLowerCase().includes('piscine')
  ) || companies[0]; // fallback: première entreprise

  if (piscine) {
    await sequelize.query(
      `UPDATE companies SET code = 'pmdo' WHERE id = :id`,
      { replacements: { id: piscine.id } }
    );
    console.log(`✅ Company #${piscine.id} "${piscine.name}" → code mis à "pmdo"`);
  }

  // ──────────────────────────────────────────────
  // 4. Mettre le code de la 2ème entreprise (Franck/Pawe) → "pawe"
  // ──────────────────────────────────────────────
  const franck = companies.find(c =>
    c.name.toLowerCase().includes('franck') ||
    c.name.toLowerCase().includes('pawe') ||
    c.name.toLowerCase().includes('pawé') ||
    (piscine && c.id !== piscine.id && companies.length > 1)
  );

  if (franck && franck.id !== piscine?.id) {
    await sequelize.query(
      `UPDATE companies SET code = 'pawe' WHERE id = :id`,
      { replacements: { id: franck.id } }
    );
    console.log(`✅ Company #${franck.id} "${franck.name}" → code mis à "pawe"`);
  }

  console.log('');

  // ──────────────────────────────────────────────
  // 5. Renommer les comptes utilisateurs _po → .pmdo
  // ──────────────────────────────────────────────
  const piscineCompanyId = piscine?.id;

  // Liste des renommages manuels pour les cas spéciaux
  const renameMap = {
    // Comptes _po → .pmdo
    'admin_po':              'admin.pmdo',
    'gerant_po':             'gerant.pmdo',
    'ahmedp_po':             'ahmedp.pmdo',
    'directeur_po':          'directeur.pmdo',
    'Ahmed_po':              'ahmed.pmdo',
    'maitrenageur_po':       'maitrenageur.pmdo',
    'serveuse_po':           'serveuse.pmdo',
    'receptionniste_po':     'receptionniste.pmdo',
    'events_po':             'events.pmdo',
    'maire_po':              'maire.pmdo',
    'responsable_po':        'responsable.pmdo',
    'fernand.kouassi_po':    'fernand.kouassi.pmdo',
    'amelie.adjoua_po':      'amelie.adjoua.pmdo',
    'didier.yao_po':         'didier.yao.pmdo',
    'fatoumata.traore_po':   'fatoumata.traore.pmdo',
    'ibrahim.kone_po':       'ibrahim.kone.pmdo',
    'sylvie.nguessan_po':    'sylvie.nguessan.pmdo',
    'mamadou.diallo_po':     'mamadou.diallo.pmdo',
    'rosemarie.bamba_po':    'rosemarie.bamba.pmdo',
    'bertrand.ouattara_po':  'bertrand.ouattara.pmdo',
    // admin/gerant sans suffixe (si company_id correspond à la piscine)
    'admin':                 'admin.pmdo',
    'gerant':                'gerant.pmdo',
    // Compte palefranck → palefranck.pawe
    'palefranck':            'palefranck.pawe',
  };

  let renamed = 0;
  let skipped = 0;

  for (const user of users) {
    const oldName = user.username;
    const newName = renameMap[oldName];

    if (!newName) {
      // Pas dans la map → inchangé (superadmin, paleadmin, etc.)
      console.log(`  ⏭️  ${oldName} → inchangé`);
      skipped++;
      continue;
    }

    if (oldName === newName) {
      console.log(`  ⏭️  ${oldName} → déjà correct`);
      skipped++;
      continue;
    }

    // Vérifier que le nouveau username n'existe pas déjà
    const [existing] = await sequelize.query(
      `SELECT id FROM users WHERE username = :username AND id != :id`,
      { replacements: { username: newName, id: user.id } }
    );

    if (existing.length > 0) {
      console.log(`  ⚠️  ${oldName} → "${newName}" déjà pris par ID #${existing[0].id} — ignoré`);
      skipped++;
      continue;
    }

    await sequelize.query(
      `UPDATE users SET username = :newName WHERE id = :id`,
      { replacements: { newName, id: user.id } }
    );
    console.log(`  ✅ #${user.id} ${oldName} → ${newName}`);
    renamed++;
  }

  console.log(`\n🎉 Migration terminée : ${renamed} renommé(s), ${skipped} ignoré(s)`);

  // ──────────────────────────────────────────────
  // 6. Afficher le résultat final
  // ──────────────────────────────────────────────
  const [finalUsers] = await sequelize.query(
    `SELECT u.id, u.username, u.role, c.name as company_name, c.code as company_code
     FROM users u LEFT JOIN companies c ON u.company_id = c.id ORDER BY u.id`
  );
  console.log('\n📋 État final des comptes :');
  finalUsers.forEach(u => {
    console.log(`  #${u.id} | ${u.username} | ${u.role} | entreprise: ${u.company_name || 'N/A'} (${u.company_code || '—'})`);
  });

  await sequelize.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Erreur migration:', err.message);
  process.exit(1);
});
