const { sequelize } = require('../config/database');
const User = require('./User');
const Ticket = require('./Ticket');
const Subscription = require('./Subscription');
const MenuItem = require('./MenuItem');
const Sale = require('./Sale');
const Room = require('./Room');
const Reservation = require('./Reservation');
const Event = require('./Event');
const Quote = require('./Quote');
const CashRegister = require('./CashRegister');
const AuditLog = require('./AuditLog');
const Employee = require('./Employee');
const Payroll = require('./Payroll');
const Expense = require('./Expense');
const Incident = require('./Incident');
const Receipt = require('./Receipt');
const UserLayout = require('./UserLayout');
const PriceSetting = require('./PriceSetting');
// ── Nouveaux modules ──────────────────────────────────
const VehicleType = require('./VehicleType');
const CarWash = require('./CarWash');
const CustomerTab = require('./CustomerTab');
const TabItem = require('./TabItem');
const Product = require('./Product');
const StockMovement = require('./StockMovement');
const Supplier = require('./Supplier');
const Purchase = require('./Purchase');
const PurchaseItem = require('./PurchaseItem');

// =====================================================
// Associations / Relations
// =====================================================

// User associations
User.hasMany(Ticket, { foreignKey: 'user_id', as: 'tickets' });
User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
User.hasMany(Event, { foreignKey: 'user_id', as: 'events' });
User.hasMany(CashRegister, { foreignKey: 'user_id', as: 'cashRegisters' });
User.hasMany(CashRegister, { foreignKey: 'validated_by', as: 'validatedCashRegisters' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });

// Ticket associations
Ticket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Subscription associations
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Sale associations
Sale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Room associations
Room.hasMany(Reservation, { foreignKey: 'room_id', as: 'reservations' });

// Reservation associations
Reservation.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Event associations
Event.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Event.hasMany(Quote, { foreignKey: 'event_id', as: 'quotes' });

// Quote associations
Quote.belongsTo(Event, { foreignKey: 'event_id', as: 'event' });

// CashRegister associations
CashRegister.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
CashRegister.belongsTo(User, { foreignKey: 'validated_by', as: 'validator' });

// AuditLog associations
AuditLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Employee associations
Employee.hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });

// Payroll associations
Payroll.belongsTo(Employee, { foreignKey: 'employee_id', as: 'employee' });
Payroll.belongsTo(User, { foreignKey: 'paid_by', as: 'paidByUser' });
Payroll.hasOne(Expense, { foreignKey: 'payroll_id', as: 'expense' });

// Expense associations
Expense.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Expense.belongsTo(Payroll, { foreignKey: 'payroll_id', as: 'payroll' });

// Incident associations
Incident.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Incident, { foreignKey: 'user_id', as: 'incidents' });

// Receipt associations
Receipt.belongsTo(CashRegister, { foreignKey: 'cash_register_id', as: 'cashRegister' });
Receipt.belongsTo(User, { foreignKey: 'cashier_id', as: 'cashier' });
Receipt.belongsTo(User, { foreignKey: 'validator_id', as: 'validator' });
CashRegister.hasOne(Receipt, { foreignKey: 'cash_register_id', as: 'receipt' });

// UserLayout associations
UserLayout.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(UserLayout, { foreignKey: 'user_id', as: 'layouts' });

// ── Lavage Auto associations ──────────────────────────
CarWash.belongsTo(VehicleType, { foreignKey: 'vehicle_type_id', as: 'vehicleType' });
VehicleType.hasMany(CarWash, { foreignKey: 'vehicle_type_id', as: 'carWashes' });
CarWash.belongsTo(CustomerTab, { foreignKey: 'tab_id', as: 'tab' });

// ── Customer Tabs (cross-service) ─────────────────────
CustomerTab.hasMany(TabItem, { foreignKey: 'tab_id', as: 'items' });
TabItem.belongsTo(CustomerTab, { foreignKey: 'tab_id', as: 'tab' });

// ── Stock / Produits associations ─────────────────────
StockMovement.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(StockMovement, { foreignKey: 'product_id', as: 'movements' });

// ── Achats / Approvisionnements ──────────────────────
Purchase.hasMany(PurchaseItem, { foreignKey: 'purchase_id', as: 'items' });
PurchaseItem.belongsTo(Purchase, { foreignKey: 'purchase_id', as: 'purchase' });
PurchaseItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(PurchaseItem, { foreignKey: 'product_id', as: 'purchaseItems' });
Purchase.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });
Supplier.hasMany(Purchase, { foreignKey: 'supplier_id', as: 'purchases' });

// =====================================================
// Export
// =====================================================

module.exports = {
  sequelize,
  User,
  Ticket,
  Subscription,
  MenuItem,
  Sale,
  Room,
  Reservation,
  Event,
  Quote,
  CashRegister,
  AuditLog,
  Employee,
  Payroll,
  Expense,
  Incident,
  Receipt,
  UserLayout,
  PriceSetting,
  // Nouveaux modules
  VehicleType,
  CarWash,
  CustomerTab,
  TabItem,
  Product,
  StockMovement,
  Supplier,
  Purchase,
  PurchaseItem
};
