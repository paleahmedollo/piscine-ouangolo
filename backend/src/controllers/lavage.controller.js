const { VehicleType, CarWash, CustomerTab, TabItem } = require('../models');
const { Op, sequelize } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// TYPES DE VÉHICULES
// ─────────────────────────────────────────────────────────────────────────────

const getVehicleTypes = async (req, res) => {
  try {
    const types = await VehicleType.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createVehicleType = async (req, res) => {
  try {
    const { name, price } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Nom et prix requis' });
    }
    const existing = await VehicleType.findOne({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Ce type existe déjà' });

    const type = await VehicleType.create({ name, price });
    res.json({ success: true, data: type, message: `Type "${name}" créé` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateVehicleType = async (req, res) => {
  try {
    const type = await VehicleType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type non trouvé' });
    await type.update(req.body);
    res.json({ success: true, data: type, message: 'Mis à jour' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteVehicleType = async (req, res) => {
  try {
    const type = await VehicleType.findByPk(req.params.id);
    if (!type) return res.status(404).json({ success: false, message: 'Type non trouvé' });
    await type.update({ is_active: false });
    res.json({ success: true, message: 'Type désactivé' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LAVAGES
// ─────────────────────────────────────────────────────────────────────────────

const createCarWash = async (req, res) => {
  try {
    const {
      vehicle_type_id, plate_number, customer_name, customer_phone,
      payment_method, payment_operator, payment_reference,
      tab_id, notes
    } = req.body;

    if (!vehicle_type_id) {
      return res.status(400).json({ success: false, message: 'Type de véhicule requis' });
    }

    const vehicleType = await VehicleType.findByPk(vehicle_type_id);
    if (!vehicleType) return res.status(404).json({ success: false, message: 'Type de véhicule non trouvé' });

    const amount = parseFloat(vehicleType.price);

    if (tab_id) {
      // ── Ajouter à un onglet client existant ──
      const tab = await CustomerTab.findByPk(tab_id);
      if (!tab || tab.status !== 'ouvert') {
        return res.status(400).json({ success: false, message: 'Onglet invalide ou déjà fermé' });
      }

      const wash = await CarWash.create({
        vehicle_type_id, plate_number, customer_name, customer_phone,
        amount, status: 'tab', tab_id, user_id: req.user?.id, notes
      });

      await TabItem.create({
        tab_id,
        service_type: 'lavage',
        item_name: `Lavage ${vehicleType.name}${plate_number ? ' (' + plate_number + ')' : ''}`,
        quantity: 1,
        unit_price: amount,
        subtotal: amount,
        reference_id: wash.id
      });

      await tab.update({ total_amount: parseFloat(tab.total_amount) + amount });
      return res.json({ success: true, data: wash, message: `Lavage ajouté à l'onglet de ${tab.customer_name}` });
    }

    // ── Paiement direct ──
    const wash = await CarWash.create({
      vehicle_type_id, plate_number, customer_name, customer_phone,
      amount, payment_method: payment_method || 'especes',
      payment_operator, payment_reference,
      status: 'paye', user_id: req.user?.id, notes
    });

    res.json({ success: true, data: wash, message: `Lavage enregistré — ${amount.toLocaleString()} FCFA` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCarWashes = async (req, res) => {
  try {
    const { date, start_date, end_date } = req.query;
    let where = {};

    if (date) {
      where.created_at = {
        [Op.gte]: new Date(date + 'T00:00:00'),
        [Op.lte]: new Date(date + 'T23:59:59')
      };
    } else if (start_date && end_date) {
      where.created_at = {
        [Op.gte]: new Date(start_date + 'T00:00:00'),
        [Op.lte]: new Date(end_date + 'T23:59:59')
      };
    }

    const washes = await CarWash.findAll({
      where,
      include: [{ model: VehicleType, as: 'vehicleType' }],
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: washes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getLavageStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [todayStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_lavages,
        COALESCE(SUM(CASE WHEN status = 'paye' THEN amount ELSE 0 END), 0) as total_cash,
        COUNT(CASE WHEN status = 'tab' THEN 1 END) as tab_count
      FROM car_washes
      WHERE DATE(created_at) = :today
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    const vehicleStats = await sequelize.query(`
      SELECT vt.name, vt.price, COUNT(cw.id) as nb_lavages,
             COALESCE(SUM(CASE WHEN cw.status='paye' THEN cw.amount ELSE 0 END), 0) as total
      FROM vehicle_types vt
      LEFT JOIN car_washes cw ON vt.id = cw.vehicle_type_id AND DATE(cw.created_at) = :today
      WHERE vt.is_active = true
      GROUP BY vt.id, vt.name, vt.price
      ORDER BY vt.name
    `, { replacements: { today }, type: sequelize.QueryTypes.SELECT });

    res.json({ success: true, data: { today: todayStats, by_vehicle: vehicleStats } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getVehicleTypes, createVehicleType, updateVehicleType, deleteVehicleType,
  createCarWash, getCarWashes, getLavageStats
};
