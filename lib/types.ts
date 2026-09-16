/**
 * API shapes — mirrors anfani-be `docs/POSTMAN_DRIVER_API.md` and
 * `docs/POSTMAN_AUTH.md`. The backend owns every rule; these are transport
 * types only. Anything the serializer may strip for a driver is optional here
 * and never assumed present.
 */

export interface Actor {
  id: string;
  ref: string;
  name: string;
  population: "STAFF" | "CLIENT" | "DRIVER";
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  actor: Actor;
}

export type TripStatus =
  | "PENDING"
  | "ASSIGNED"
  | "LOADING"
  | "IN_TRANSIT"
  | "DELIVERED";

export const tripStatusLabels: Record<TripStatus, string> = {
  PENDING: "Waiting for assignment",
  ASSIGNED: "Assigned to you",
  LOADING: "Loading",
  IN_TRANSIT: "On the road",
  DELIVERED: "Delivered",
};

export interface NamedRef {
  id: string;
  ref: string;
  name: string;
}

export interface TripDestination extends NamedRef {
  state?: string | null;
  specialInstructions?: string | null;
  standardFuelLiters?: number | null;
}

export interface TripTruck {
  id: string;
  ref: string;
  truckNumber?: string | null;
  registration?: string | null;
}

export type WaybillType = "PRE" | "POST";

export interface Waybill {
  id: string;
  ref: string;
  tripId: string;
  type: WaybillType;
  /**
   * The number printed on the customer's own waybill (14 Sep 2026). It goes on
   * Anfani's invoice and is what the customer reconciles against. Optional: a
   * number that cannot be read must never stop the photo going up.
   */
  waybillNumber?: string | null;
  photoMimeType?: string;
  photoSizeBytes?: number;
  gpsLat?: number | null;
  gpsLng?: number | null;
  capturedAt?: string | null;
  qualityCheckPassed?: boolean | null;
  gpsMatchesDestination?: boolean | null;
  distanceFromDestinationKm?: number | null;
  warnings?: string[];
}

export interface Trip {
  id: string;
  ref: string;
  status: TripStatus;
  client?: NamedRef | null;
  destination?: TripDestination | null;
  loadingPoint?: string | null;
  truck?: TripTruck | null;
  expectedEta?: string | null;
  agreedRoute?: string | null;
  kmToAndFro?: number | null;
  fuelEstimateLiters?: number | null;
  deliveredAt?: string | null;
  waybills?: Waybill[];
}

export type JourneyPlanStatus =
  | "PRE_TRIP_PENDING"
  | "ACTIVE"
  | "AWAITING_RETURN"
  | "FINALIZED";

export const journeyPlanStatusLabels: Record<JourneyPlanStatus, string> = {
  PRE_TRIP_PENDING: "Waiting on the pre-departure checks",
  ACTIVE: "Active",
  AWAITING_RETURN: "Waiting on the return declaration",
  FINALIZED: "Finished",
};

export interface JourneyPlanHazard {
  type: string;
  checked: boolean;
  note?: string | null;
}

export interface JourneyPlanLeg {
  kind: "PLANNED" | "ACTUAL";
  direction: "OUTBOUND" | "INBOUND";
  route?: string | null;
  departureAt?: string | null;
  arrivalAt?: string | null;
  restStops?: string | null;
}

export interface Violation {
  id: string;
  type: string;
  occurrences?: number | null;
  locations?: string | null;
  at?: string | null;
  driverFeedback?: string | null;
  driverFeedbackAt?: string | null;
}

export interface JourneyPlan {
  id: string;
  ref: string;
  status: JourneyPlanStatus;
  hazards?: JourneyPlanHazard[];
  deliveryInstructions?: string | null;
  routeInstructions?: string | null;
  legs?: JourneyPlanLeg[];
  violations?: Violation[];
  preTripDriverAt?: string | null;
  preTripCoordinatorAt?: string | null;
  returnDriverAt?: string | null;
  returnCoordinatorAt?: string | null;
  tripConclusion?: string | null;
  loadingGate?: { ready: boolean; missing?: string[] };
}

export interface PendingDeclarations {
  preTripDeclaration: boolean;
  returnDeclaration: boolean;
  /** True only for the pre-departure declaration — the one real block. */
  blockingNextStep: boolean;
  message?: string | null;
}

export interface CurrentTripResponse {
  trip: Trip | null;
  journeyPlan?: JourneyPlan | null;
  pending?: PendingDeclarations | null;
  message?: string | null;
}

/**
 * A pending declaration from `GET /driver-api/me/reminders`. This is the only
 * way a delivered trip stays reachable: `/me/current-trip` goes null the moment
 * Ops marks it delivered, but the return declaration is still outstanding.
 */
export interface Reminder {
  journeyPlanId: string;
  ref: string;
  tripId: string;
  tripRef: string;
  status: JourneyPlanStatus;
  stage: "pre_trip" | "return";
  awaitingDriver: boolean;
  awaitingCoordinator: boolean;
  /** Only the pre-departure declaration is ever true. */
  blocking: boolean;
  blocks?: string | null;
}

/**
 * `GET /driver-api/trips/:id` — the full record, shaped differently from the
 * start-screen payload (destination arrives as `location`, the km figure lives
 * on it). This type covers only the fields the PWA is allowed to show: the
 * response also carries billing and margin figures, which drivers never see.
 */
export interface TripDetail {
  id: string;
  ref: string;
  status: TripStatus;
  client?: NamedRef | null;
  location?: (TripDestination & { kmToAndFro?: number | null }) | null;
  loadingPoint?: string | null;
  truck?: TripTruck | null;
  expectedEta?: string | null;
  agreedRoute?: string | null;
  fuelEstimateLiters?: number | null;
  deliveredAt?: string | null;
  waybills?: Waybill[];
}

/** Normalise a full trip record into the start-screen `Trip` shape. */
export function tripFromDetail(detail: TripDetail): Trip {
  return {
    id: detail.id,
    ref: detail.ref,
    status: detail.status,
    client: detail.client ?? null,
    destination: detail.location ?? null,
    loadingPoint: detail.loadingPoint ?? null,
    truck: detail.truck ?? null,
    expectedEta: detail.expectedEta ?? null,
    agreedRoute: detail.agreedRoute ?? null,
    kmToAndFro: detail.location?.kmToAndFro ?? null,
    fuelEstimateLiters: detail.fuelEstimateLiters ?? null,
    deliveredAt: detail.deliveredAt ?? null,
    waybills: detail.waybills ?? [],
  };
}

/**
 * Fuel stop (TRACKSURE.md §12, §7).
 *
 * Note what is NOT here: the station carries no payment type. Credit vs cash is
 * a property of Anfani's arrangement with the station, resolved server-side at
 * capture and snapshotted onto the receipt — the driver picks a place, never a
 * payment method (invariant §15.5). `GET /driver-api/stations` omits the type
 * for exactly that reason.
 */
export interface Station {
  id: string;
  ref: string;
  name: string;
  address?: string | null;
}

export interface StationsResponse {
  stations: Station[];
  note?: string | null;
}

/** What `GET /driver-api/trips/:id/fuel-receipts` gives back, and no more. */
export type FuelPaymentType = "CREDIT" | "CASH";

/**
 * One diesel purchase, as far as this trip is concerned (16 Sep 2026).
 *
 * `liters` and `amountKobo` are THIS TRIP'S SHARE, not the whole fill. A
 * driver fuelled once in Lagos for the run to Jos and back sees the litres put
 * against this leg; `purchasedLiters` is what actually went into the tank that
 * day, so a figure they want to dispute is traceable to the receipt.
 */
export interface FuelReceipt {
  id: string;
  ref: string;
  /** The allocation line, for pointing at when a figure looks wrong. */
  allocationRef?: string | null;
  /** Litres put against THIS trip. */
  liters?: number | null;
  /** Integer kobo, this trip's pro-rata share. Divide by 100 at render, never before. */
  amountKobo?: number | null;
  /** The whole fill the truck was handed, when it covered more than this leg. */
  purchasedLiters?: number | null;
  capturedAt?: string | null;
  note?: string | null;
  stationNameAtCapture?: string | null;
  /**
   * How this stop was paid for, as captured. Added to the list on
   * 14 Sep 2026: the driver used to learn it at the moment they captured a
   * receipt themselves, and capture moved to Operations — so without it here
   * they would never find out whether they are out of pocket on a stop logged
   * in their name.
   */
  resolvedType?: FuelPaymentType | null;
}

/**
 * The capture response. Unlike the list, this one DOES carry `resolvedType` —
 * the one moment the driver is told how the fuel was paid for, which is worth
 * telling them: at a credit station they hand over nothing, at a cash station
 * they are out of pocket until Ops settles.
 *
 * The same payload also carries trip cost figures. They are deliberately absent
 * from this type so no screen can reach for them.
 */
export interface FuelReceiptCreated extends FuelReceipt {
  resolvedType?: FuelPaymentType | null;
  stationId?: string;
}

export const fuelPaymentCopy: Record<
  FuelPaymentType,
  { title: string; body: string }
> = {
  CREDIT: {
    title: "Anfani's credit account",
    body: "This station bills the office. You should not have paid anything.",
  },
  CASH: {
    title: "Paid cash",
    body: "The office settles cash stations with you. Keep the paper receipt.",
  },
};

export interface Complaint {
  id: string;
  tripId: string;
  author: "DRIVER" | "OPS";
  text: string;
  photoKey?: string | null;
  at: string;
}

/** Human labels for the hazard checklist codes (journey plan template v3). */
export const hazardLabels: Record<string, string> = {
  BACKING_DURING_DELIVERY: "Backing during delivery",
  NARROW_DRIVEWAY: "Narrow driveway",
  ENTRY_EXIT_ISSUES: "Entry / exit issues",
  TERRAIN: "Difficult terrain",
  PARKING_SHOULDER: "Parking shoulder",
  HEAVY_STREET_TRAFFIC: "Heavy street or lot traffic",
  HEAVY_PEDESTRIAN_TRAFFIC: "Heavy pedestrian traffic",
  MOTORBIKES_TRICYCLES: "Motorbikes and tricycles",
  SECURITY_THREAT: "Security threat",
};

export const violationLabels: Record<string, string> = {
  OVERSPEEDING: "Overspeeding",
  HARSH_BRAKING: "Harsh braking",
  UNAUTHORIZED_ROUTE: "Unauthorised route",
  POSSIBLE_TAMPERING: "Possible tampering",
  POSSIBLE_ILLEGAL_TRANSACTION: "Possible illegal transaction",
  DRIVER_PLUG_VIOLATION: "Driver plug / ID key",
  HOURS_OF_SERVICE: "Hours of service",
  DELAY: "Delay",
};

/** Turn an UPPER_SNAKE code into something readable when we have no label. */
export function humanise(code: string): string {
  const s = code.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ── Trip history (§12, added 14 Sep 2026) ──────────────────────────────── */

/**
 * One trip on the driver's own record.
 *
 * `kmToAndFro` is the trip's snapshotted round-trip distance — the same figure
 * that moves the truck's service countdown, so a driver's total and Anfani's
 * own numbers can never disagree. The journey-plan odometer is deliberately not
 * used: it is HSE data and is missing wherever a return section was never
 * completed.
 *
 * No freight, no fuel value, no cost, no margin. Shortages ARE here, because
 * they are recorded against the driver and affect them.
 */
export interface HistoryTrip {
  id: string;
  ref: string;
  status: TripStatus;
  businessDate: string;
  client: { id: string; name: string } | null;
  destination: { id: string; name: string; state: string | null } | null;
  truck: { id: string; truckNumber: string; registration?: string | null } | null;
  loadingPoint: string | null;
  goodsDescription: string | null;
  loadTons: number | null;
  kmToAndFro: number;
  expectedEta: string | null;
  deliveredAt: string | null;
  /**
   * Delivered by the promised date. **Null means unknown, not late** — one of
   * the two dates is missing, and a driver's record must never show a miss that
   * was really a gap in the data.
   */
  onTime: boolean | null;
  journeyPlan: { id: string; ref: string; status: string } | null;
  hasPostWaybill: boolean;
  shortages: {
    ref: string;
    amountKobo: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
  }[];
}

export interface HistorySummary {
  trips: number;
  tripsDelivered: number;
  /** Σ round-trip km of DELIVERED trips. Undelivered km is not km run. */
  kmTravelled: number;
  onTime: {
    delivered: number;
    onTime: number;
    /** Null when no trip carried both dates — never rendered as 0%. */
    rate: number | null;
    note: string;
  };
  shortages: {
    approvedCount: number;
    approvedKobo: number;
    pendingCount: number;
    note: string;
  };
}

export interface HistoryPage {
  data: HistoryTrip[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
  summary: HistorySummary;
}
