const { sequelize } = require('../config/database');
const { Op } = require('sequelize');
const Company = require('./Company');
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
// Super Admin modules
const SupportTicket = require('./SupportTicket');
const Invoice = require('./Invoice');
const SaasSubscription = require('./SaasSubscription');
const SystemLog = require('./SystemLog');
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
// ── Pressing ──────────────────────────────────────────
const PressingType = require('./PressingType');
const PressingOrder = require('./PressingOrder');
// ── Dépôt ─────────────────────────────────────────────
const DepotClient = require('./DepotClient');
const DepotSale = require('./DepotSale');
const DepotSaleItem = require('./DepotSaleItem');
// ── Manquants caisse ──────────────────────────────────
const CashShortage = require('./CashShortage');
// ── Comptabilité ──────────────────────────────────────
const AccountingAccount = require('./AccountingAccount')(require('../config/database').sequelize);
const AccountingEntry   = require('./AccountingEntry')(require('../config/database').sequelize);
// ── Restaurant V2 ─────────────────────────────────────
const RestaurantTable = require('./RestaurantTable');
const RestaurantOrder = require('./RestaurantOrder');
const RestaurantOrderItem = require('./RestaurantOrderItem');
const RestaurantNotification = require('./RestaurantNotification');

// =====================================================
// Associations / Relations
// =====================================================

// Company associations
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
Company.hasMany(SupportTicket, { foreignKey: 'company_id', as: 'supportTickets' });
Company.hasMany(Invoice, { foreignKey: 'company_id', as: 'invoices' });
Company.hasMany(SaasSubscription, { foreignKey: 'company_id', as: 'saasSubscriptions' });

// User associations
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
User.hasMany(Ticket, { foreignKey: 'user_id', as: 'tickets' });
User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
User.hasMany(Sale, { foreignKey: 'user_id', as: 'sales' });
User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
User.hasMany(Event, { foreignKey: 'user_id', as: 'events' });
User.hasMany(CashRegister, { foreignKey: 'user_id', as: 'cashRegisters' });
User.hasMany(CashRegister, { foreignKey: 'validated_by', as: 'validatedCashRegisters' });
User.hasMany(AuditLog, { foreignKey: 'user_id', as: 'auditLogs' });
User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'supportTickets' });
User.hasMany(SystemLog, { foreignKey: 'user_id', as: 'systemLogs' });

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

// SupportTicket associations
SupportTicket.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
SupportTicket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedUser' });

// Invoice associations
Invoice.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// SaasSubscription associations
SaasSubscription.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// SystemLog associations
SystemLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
SystemLog.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

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
Purchase.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Purchase, { foreignKey: 'user_id', as: 'purchases' });

// ── Pressing ──────────────────────────────────────────
PressingOrder.belongsTo(PressingType, { foreignKey: 'pressing_type_id', as: 'pressingType' });
PressingType.hasMany(PressingOrder, { foreignKey: 'pressing_type_id', as: 'orders' });

// ── Dépôt ─────────────────────────────────────────────
DepotSale.belongsTo(DepotClient, { foreignKey: 'depot_client_id', as: 'client' });
DepotClient.hasMany(DepotSale, { foreignKey: 'depot_client_id', as: 'sales' });
DepotSale.hasMany(DepotSaleItem, { foreignKey: 'depot_sale_id', as: 'items' });
DepotSaleItem.belongsTo(DepotSale, { foreignKey: 'depot_sale_id', as: 'sale' });
DepotSaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
DepotSale.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(DepotSale, { foreignKey: 'user_id', as: 'depotSales' });

// ── Manquants caisse ──────────────────────────────────
CashShortage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(CashShortage, { foreignKey: 'user_id', as: 'cashShortages' });

// ── Comptabilité ──────────────────────────────────────
AccountingAccount.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });
Company.hasMany(AccountingAccount, { foreignKey: 'company_id', as: 'accountingAccounts' });
AccountingEntry.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

// ── Restaurant V2 ─────────────────────────────────────
RestaurantTable.hasMany(RestaurantOrder, { foreignKey: 'table_id', as: 'orders' });
RestaurantOrder.belongsTo(RestaurantTable, { foreignKey: 'table_id', as: 'table' });
RestaurantOrder.hasMany(RestaurantOrderItem, { foreignKey: 'order_id', as: 'items' });
RestaurantOrderItem.belongsTo(RestaurantOrder, { foreignKey: 'order_id', as: 'order' });
RestaurantOrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem' });
RestaurantOrder.belongsTo(User, { foreignKey: 'serveuse_id', as: 'serveuse' });
RestaurantOrder.belongsTo(User, { foreignKey: 'cuisinier_id', as: 'cuisinier' });
RestaurantNotification.belongsTo(RestaurantOrder, { foreignKey: 'order_id', as: 'order' });
RestaurantNotification.belongsTo(User, { foreignKey: 'destinataire_id', as: 'destinataire' });
User.hasMany(RestaurantNotification, { foreignKey: 'destinataire_id', as: 'restaurantNotifications' });

// =====================================================
// Export
// =====================================================

module.exports = {
  sequelize,
  Op,
  Company,
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
  SupportTicket,
  Invoice,
  SaasSubscription,
  SystemLog,
  // Nouveaux modules
  VehicleType,
  CarWash,
  CustomerTab,
  TabItem,
  Product,
  StockMovement,
  Supplier,
  Purchase,
  PurchaseItem,
  // Pressing
  PressingType,
  PressingOrder,
  // Dépôt
  DepotClient,
  DepotSale,
  DepotSaleItem,
  // Manquants
  CashShortage,
  // Comptabilité
  AccountingAccount,
  AccountingEntry,
  // Restaurant V2
  RestaurantTable,
  RestaurantOrder,
  RestaurantOrderItem,
  RestaurantNotification
};
