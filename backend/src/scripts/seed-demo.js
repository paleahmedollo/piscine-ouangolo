/**
 * seed-demo.js — Données de démonstration pour l'environnement staging
 * S'exécute uniquement quand NODE_ENV=staging, au démarrage de l'app.
 * Idempotent : si la company "demo" existe déjà, ne fait rien.
 */
const bcrypt = require('bcryptjs');

const seedDemoData = async (sequelize) => {
  if (process.env.NODE_ENV !== 'staging') return;

  try {
    // ── Vérification idempotente ──────────────────────────────────────────────
    const [existing] = await sequelize.query(
      `SELECT id FROM companies WHERE code = 'demo' LIMIT 1`,
      { type: 'SELECT' }
    );
    if (existing) {
      console.log('[STAGING] Données démo déjà présentes — skip');
      return;
    }

    console.log('[STAGING] 🎭 Création des données démo "Complexe Beau Rivage"...');

    // ── 1. Entreprise démo ────────────────────────────────────────────────────
    const [company] = await sequelize.query(
      `INSERT INTO companies
         (name, code, locality, country, address, phone, email, activity_type,
          manager_name, manager_phone, plan, status, is_active,
          subscription_start, subscription_end, modules, created_at, updated_at)
       VALUES
         ('Complexe Beau Rivage', 'demo', 'Abidjan, Cocody', 'Côte d''Ivoire',
          'Boulevard des Martyrs, Cocody', '+225 07 12 34 56', 'contact@beaurivage.ci',
          'Piscine', 'Kofi Mensah', '+225 07 00 00 01', 'pro', 'actif', true,
          '2025-01-01', '2027-12-31', NULL, NOW(), NOW())
       RETURNING id`,
      { type: 'SELECT' }
    );
    const cid = company.id;

    // ── 2. Comptes utilisateurs démo ──────────────────────────────────────────
    const hashedPass = await bcrypt.hash('Demo@2026', 10);
    const usersToCreate = [
      { username: 'directeur.demo',    full_name: 'Kofi Mensah (Démo)',    role: 'directeur'    },
      { username: 'serveuse.demo',     full_name: 'Aminata Touré',         role: 'serveuse'     },
      { username: 'reception.demo',    full_name: 'Bamba Coulibaly',       role: 'reception'    },
      { username: 'maitrenageur.demo', full_name: 'Youssouf Diallo',       role: 'maitre_nageur'},
    ];
    const userIds = {};
    for (const u of usersToCreate) {
      const [row] = await sequelize.query(
        `INSERT INTO users (username, password_hash, full_name, role, is_active, company_id, created_at, updated_at)
         VALUES (:username, :pass, :full_name, :role, true, :cid, NOW(), NOW())
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        { replacements: { ...u, pass: hashedPass, cid }, type: 'SELECT' }
      );
      if (row) userIds[u.role] = row.id;
    }
    const dirId    = userIds['directeur'];
    const servId   = userIds['serveuse'];
    const recepId  = userIds['reception'];
    const nageurId = userIds['maitre_nageur'];

    // ── 3. Tables restaurant démo ─────────────────────────────────────────────
    for (let i = 1; i <= 8; i++) {
      await sequelize.query(
        `INSERT INTO restaurant_tables (numero, capacite, statut, company_id, created_at, updated_at)
         SELECT :num, :cap, 'libre', :cid, NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM restaurant_tables WHERE numero = :num AND company_id = :cid
         )`,
        { replacements: { num: i, cap: i <= 4 ? 4 : 6, cid } }
      );
    }
    const tables = await sequelize.query(
      `SELECT id FROM restaurant_tables WHERE company_id = :cid ORDER BY id`,
      { replacements: { cid }, type: 'SELECT' }
    );

    // ── 4. Chambres hôtel démo ────────────────────────────────────────────────
    const demoRooms = [
      { number: '101', type: 'Simple',              capacity: 1, price_per_night: 10000 },
      { number: '102', type: 'Simple',              capacity: 1, price_per_night: 10000 },
      { number: '103', type: 'Standard',            capacity: 2, price_per_night: 15000 },
      { number: '104', type: 'Standard',            capacity: 2, price_per_night: 15000 },
      { number: '201', type: 'Suite',               capacity: 2, price_per_night: 25000 },
      { number: '202', type: 'Suite',               capacity: 3, price_per_night: 30000 },
      { number: '203', type: 'Suite Présidentielle',capacity: 4, price_per_night: 45000 },
    ];
    for (const r of demoRooms) {
      await sequelize.query(
        `INSERT INTO rooms (number, type, capacity, price_per_night, status, company_id, created_at, updated_at)
         SELECT :number, :type, :capacity, :price, 'disponible', :cid, NOW(), NOW()
         WHERE NOT EXISTS (
           SELECT 1 FROM rooms WHERE number = :number AND company_id = :cid
         )`,
        { replacements: { ...r, price: r.price_per_night, cid } }
      );
    }
    const rooms = await sequelize.query(
      `SELECT id, price_per_night FROM rooms WHERE company_id = :cid ORDER BY id`,
      { replacements: { cid }, type: 'SELECT' }
    );

    // ── 5. Tickets piscine — 30 derniers jours ────────────────────────────────
    const ticketTypes = [
      { type: 'ticket_adulte',       unit_price: 2000  },
      { type: 'ticket_enfant',       unit_price: 1000  },
      { type: 'abonnement_mensuel',  unit_price: 25000 },
    ];
    const payMethods = ['especes', 'especes', 'especes', 'mobile_money', 'mobile_money', 'carte'];
    const rng = (n) => Math.floor(Math.random() * n);

    for (let day = 29; day >= 0; day--) {
      const d = new Date();
      d.setDate(d.getDate() - day);
      const dateStr = d.toISOString().replace('T', ' ').substring(0, 19);
      const numTickets = 3 + rng(7); // 3–9 tickets/jour
      for (let t = 0; t < numTickets; t++) {
        const tt  = ticketTypes[rng(day % 7 === 0 ? 3 : 2)]; // abonnements surtout le lundi
        const qty = tt.type === 'ticket_adulte' ? 1 + rng(4) : 1;
        await sequelize.query(
          `INSERT INTO tickets (user_id, type, quantity, unit_price, total, payment_method, company_id, created_at)
           VALUES (:uid, :type, :qty, :price, :total, :method, :cid, :date)`,
          { replacements: {
              uid: nageurId, type: tt.type, qty,
              price: tt.unit_price, total: tt.unit_price * qty,
              method: payMethods[rng(payMethods.length)],
              cid, date: dateStr
          }}
        );
      }
    }

    // ── 6. Commandes restaurant — 20 derniers jours ───────────────────────────
    const menuItems = await sequelize.query(
      `SELECT id, name, price FROM menu_items WHERE is_available = true LIMIT 20`,
      { type: 'SELECT' }
    );
    if (menuItems.length > 0 && tables.length > 0) {
      for (let day = 19; day >= 0; day--) {
        const d = new Date();
        d.setDate(d.getDate() - day);
        const dateStr = d.toISOString().replace('T', ' ').substring(0, 19);
        const numOrders = 2 + rng(5); // 2–6 commandes/jour
        for (let o = 0; o < numOrders; o++) {
          const tableId = tables[rng(tables.length)].id;
          const numItems = 1 + rng(3);
          let orderTotal = 0;
          const items = [];
          for (let i = 0; i < numItems; i++) {
            const mi  = menuItems[rng(menuItems.length)];
            const qty = 1 + rng(2);
            const sub = Number(mi.price) * qty;
            orderTotal += sub;
            items.push({ id: mi.id, name: mi.name, price: mi.price, qty, sub });
          }
          const [order] = await sequelize.query(
            `INSERT INTO restaurant_orders
               (company_id, table_id, serveuse_id, statut, total, mode_paiement, paid_at, created_at, updated_at)
             VALUES (:cid, :tid, :sid, 'payee', :total, 'especes', :date, :date, :date)
             RETURNING id`,
            { replacements: { cid, tid: tableId, sid: servId, total: orderTotal, date: dateStr },
              type: 'SELECT' }
          );
          const orderId = order?.id;
          if (orderId) {
            for (const it of items) {
              await sequelize.query(
                `INSERT INTO restaurant_order_items
                   (order_id, menu_item_id, nom_plat, quantite, prix_unitaire, sous_total, created_at)
                 VALUES (:oid, :mid, :name, :qty, :price, :sub, :date)`,
                { replacements: { oid: orderId, mid: it.id, name: it.name,
                    qty: it.qty, price: it.price, sub: it.sub, date: dateStr } }
              );
            }
          }
        }
      }
    }

    // ── 7. Réservations hôtel — 8 séjours ────────────────────────────────────
    const clientNames = [
      'Kouassi Adjoumani', 'Diallo Fatoumata', 'Koné Ibrahim',     'Touré Mariam',
      'Coulibaly Moussa',  "N'Goran Valentin",  'Aké Prisca',       'Soumahoro Mamadou',
    ];
    const origins = ['Abidjan', 'Bouaké', 'Korhogo', 'San-Pédro', 'Man', 'Daloa', 'Yamoussoukro', 'Odienné'];
    for (let i = 0; i < 8 && i < rooms.length; i++) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() - (20 - i * 2));
      const nights = 1 + rng(3);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + nights);
      const room = rooms[rng(rooms.length)];
      const totalPrice = Number(room.price_per_night) * nights;
      const deposit = Math.round(totalPrice * 0.3);
      await sequelize.query(
        `INSERT INTO reservations
           (room_id, client_name, client_phone, check_in, check_out, nights,
            total_price, deposit_paid, status, origin_city, user_id, company_id, created_at, updated_at)
         VALUES
           (:rid, :name, :phone, :cin, :cout, :nights,
            :total, :deposit, :status, :origin, :uid, :cid, :cin::date - interval '1 day', NOW())`,
        { replacements: {
            rid: room.id, name: clientNames[i],
            phone: `07${String(10000000 + rng(90000000))}`,
            cin: checkIn.toISOString().split('T')[0],
            cout: checkOut.toISOString().split('T')[0],
            nights, total: totalPrice, deposit,
            status: i < 6 ? 'terminee' : 'confirmee',
            origin: origins[i], uid: recepId, cid
        }}
      );
    }

    // ── 8. Événements — 5 événements ─────────────────────────────────────────
    const events = [
      { name: 'Mariage Konan-Diabaté',          space: 'Salle de banquet',     guests: 200, price: 350000 },
      { name: 'Anniversaire 40 ans Dr. Yao',    space: 'Piscine + terrasse',   guests: 80,  price: 150000 },
      { name: 'Séminaire Entreprise SODECI',     space: 'Salle de conférence',  guests: 50,  price: 200000 },
      { name: 'Soirée gala Association AFJCI',   space: 'Grande salle',         guests: 120, price: 250000 },
      { name: 'Baptême famille Touré',           space: 'Jardin extérieur',     guests: 100, price: 180000 },
    ];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const evDate = new Date();
      evDate.setDate(evDate.getDate() - (15 - i * 3));
      await sequelize.query(
        `INSERT INTO events
           (name, client_name, client_phone, event_date, event_time, space,
            guest_count, price, deposit_paid, status, user_id, company_id, created_at, updated_at)
         VALUES
           (:name, :client, :phone, :date, '18:00:00', :space,
            :guests, :price, :deposit, :status, :uid, :cid, NOW(), NOW())`,
        { replacements: {
            name: ev.name, client: clientNames[i],
            phone: `05${String(10000000 + rng(90000000))}`,
            date: evDate.toISOString().split('T')[0],
            space: ev.space, guests: ev.guests, price: ev.price,
            deposit: Math.round(ev.price * 0.4),
            status: i < 3 ? 'confirme' : 'termine',
            uid: dirId, cid
        }}
      );
    }

    // ── 9. Employés ───────────────────────────────────────────────────────────
    const employees = [
      { full_name: 'Aminata Touré',   position: 'Serveuse',           base_salary: 80000  },
      { full_name: 'Youssouf Diallo', position: 'Maître-nageur',      base_salary: 90000  },
      { full_name: 'Bamba Coulibaly', position: 'Réceptionniste',     base_salary: 85000  },
      { full_name: 'Fanta Konaté',    position: 'Cuisinière',         base_salary: 95000  },
      { full_name: 'Drissa Traoré',   position: 'Agent de sécurité',  base_salary: 70000  },
      { full_name: 'Mariam Sanogo',   position: 'Femme de chambre',   base_salary: 65000  },
    ];
    for (const emp of employees) {
      await sequelize.query(
        `INSERT INTO employees (full_name, position, base_salary, hire_date, contract_type, is_active, company_id, created_at, updated_at)
         VALUES (:name, :pos, :salary, '2024-01-15', 'cdi', true, :cid, NOW(), NOW())`,
        { replacements: { name: emp.full_name, pos: emp.position, salary: emp.base_salary, cid } }
      );
    }

    console.log('[STAGING] ✅ Données démo créées avec succès !');
    console.log('[STAGING] ╔════════════════════════════════════════╗');
    console.log('[STAGING] ║  Compte démo : directeur.demo          ║');
    console.log('[STAGING] ║  Mot de passe : Demo@2026              ║');
    console.log('[STAGING] ╚════════════════════════════════════════╝');
  } catch (err) {
    console.error('[STAGING] ❌ Erreur seed démo:', err.message);
  }
};

module.exports = seedDemoData;
