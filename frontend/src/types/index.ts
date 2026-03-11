// Types pour l'application OLLENTRA

export type UserRole =
  | 'admin'
  | 'maitre_nageur'
  | 'serveuse'
  | 'serveur'
  | 'receptionniste'
  | 'gestionnaire_events'
  | 'gerant'
  | 'responsable'
  | 'directeur'
  | 'maire'
  | 'super_admin'
  | 'cuisinier'
  | 'caissier'
  | 'caissier_lavage'
  | 'caissier_pressing'
  | 'caissier_maquis'
  | 'caissier_superette'
  | 'caissier_depot';

export interface Company {
  id: number;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  plan: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  company_id?: number | null;
  company?: Company | null;
  created_at: string;
  sa_permissions?: string[] | null;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Piscine
export type TicketType = 'adulte' | 'enfant';
export type PaymentMethod = 'especes' | 'carte' | 'mobile_money' | 'chambre';
export type SubscriptionType = 'mensuel' | 'trimestriel' | 'annuel';

export interface Ticket {
  id: number;
  user_id: number;
  type: TicketType;
  quantity: number;
  unit_price: number;
  total: number;
  payment_method: PaymentMethod;
  created_at: string;
  user?: User;
}

export interface Subscription {
  id: number;
  client_name: string;
  client_phone?: string;
  type: SubscriptionType;
  start_date: string;
  end_date: string;
  price: number;
  user_id: number;
  is_active: boolean;
  created_at: string;
  user?: User;
}

// Restaurant
export type MenuCategory = 'entree' | 'plat' | 'dessert' | 'boisson' | 'snack';

export interface MenuItem {
  id: number;
  name: string;
  category: MenuCategory;
  price: number;
  description?: string;
  is_available: boolean;
}

export interface SaleItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Sale {
  id: number;
  user_id: number;
  items_json: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod | 'en_attente';
  table_number?: string;
  room_number?: string;
  status: 'ouvert' | 'ferme';
  created_at: string;
  user?: User;
}

// Hôtel
export type RoomType = 'Simple' | 'Double' | 'Suite' | 'VIP' | 'Familiale' | string;
export type RoomStatus = 'disponible' | 'occupee' | 'maintenance' | 'nettoyage';
export type ReservationStatus = 'confirmee' | 'en_cours' | 'terminee' | 'annulee';

export interface Room {
  id: number;
  number: string;
  type: string;
  capacity: number;
  price_per_night: number;
  status: RoomStatus;
  amenities?: Record<string, boolean>;
}

export interface Reservation {
  id: number;
  room_id: number;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  check_in: string;
  check_out: string;
  nights: number;
  total_price: number;
  deposit_paid: number;
  status: ReservationStatus;
  notes?: string;
  cni_number?: string;
  origin_city?: string;
  destination_city?: string;
  user_id: number;
  created_at: string;
  room?: Room;
  user?: User;
}

// Événements
export type EventSpace = 'salle_conference' | 'terrasse' | 'jardin' | 'piscine_privee' | 'restaurant_prive';
export type EventStatus = 'demande' | 'confirme' | 'en_cours' | 'termine' | 'annule';
export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'paye';

export interface Event {
  id: number;
  name: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
  event_date: string;
  event_time?: string;
  end_date?: string;
  space: EventSpace;
  guest_count?: number;
  description?: string;
  status: EventStatus;
  price?: number;
  deposit_paid?: number;
  user_id: number;
  created_at: string;
  user?: User;
  quotes?: Quote[];
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: number;
  event_id: number;
  items_json: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  deposit_required: number;
  deposit_paid: number;
  balance: number;
  status: QuoteStatus;
  valid_until?: string;
  notes?: string;
  created_at: string;
}

// Caisse
export type CashRegisterModule =
  | 'piscine'
  | 'restaurant'
  | 'hotel'
  | 'events'
  | 'lavage'
  | 'pressing'
  | 'maquis'
  | 'superette'
  | 'depot';

export type CashRegisterStatus = 'en_attente' | 'validee' | 'rejetee';

export interface CashRegister {
  id: number;
  user_id: number;
  module: CashRegisterModule;
  date: string;
  opening_amount: number;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  status: CashRegisterStatus;
  validated_by?: number;
  validated_at?: string;
  notes?: string;
  transactions_count: number;
  created_at: string;
  user?: User;
  validator?: User;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      pages: number;
    };
  };
}

// Dashboard
export interface DashboardModule {
  aujourd_hui?: {
    ventes?: number;
    montant?: number;
    tickets_adulte?: number;
    tickets_enfant?: number;
    check_ins?: number;
    check_outs?: number;
  };
  mois?: {
    ventes?: number;
    montant?: number;
  };
  chambres?: {
    total: number;
    disponibles: number;
    occupees: number;
    maintenance: number;
    nettoyage: number;
  };
  taux_occupation?: number;
  abonnements_actifs?: number;
  evenements_a_venir?: number;
  evenements_ce_mois?: number;
  evenements_confirmes?: number;
  devis_en_attente?: number;
  prochains?: Array<{
    id: number;
    name: string;
    date: string;
    space: string;
    status: string;
  }>;
}

export interface Dashboard {
  date: string;
  modules: {
    piscine?: DashboardModule;
    restaurant?: DashboardModule;
    hotel?: DashboardModule;
    events?: DashboardModule;
    lavage?: DashboardModule;
    pressing?: DashboardModule;
    maquis?: DashboardModule;
    superette?: DashboardModule;
    depot?: DashboardModule;
  };
  global?: {
    ca_aujourd_hui: number;
    ca_mois: number;
    clotures_en_attente: number;
    utilisateurs_actifs: number;
  };
}

// Offline sync
export interface PendingTransaction {
  id: string;
  type: 'ticket' | 'sale' | 'reservation' | 'event' | 'quote';
  data: Record<string, unknown>;
  timestamp: number;
  synced: boolean;
}
