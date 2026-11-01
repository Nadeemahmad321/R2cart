export type DeliveryStatus =
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_PROOF_PENDING'
  | 'DELIVERED'
  | 'DELIVERY_FAILED';

export interface DeliveryAction {
  actionKey: 'ACCEPT' | 'PICKUP' | 'START_DELIVERY' | 'COMPLETE_DELIVERY' | 'REPORT_FAILURE' | 'VIEW_DETAILS';
  nextStatus?: DeliveryStatus;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor?: string;
  isPrimary?: boolean;
  requiresConfirmation?: boolean;
  confirmationTitle?: string;
  confirmationMessage?: string;
}

export const BACKEND_DELIVERY_FAILURE_REASONS = [
  'Customer unavailable',
  'Customer refused delivery',
  'Incorrect address',
  'Customer unreachable',
  'Delivery location inaccessible',
  'Other reason',
] as const;

export type DeliveryFailureReason = (typeof BACKEND_DELIVERY_FAILURE_REASONS)[number];

/**
 * Returns UI metadata for a delivery status (badge colors, readable label, icon)
 */
export function getDeliveryStatusMeta(status: string | undefined) {
  const normalized = (status || 'ASSIGNED').toUpperCase();

  switch (normalized) {
    case 'ASSIGNED':
      return {
        label: 'Assigned',
        badgeBg: '#F1F5F9',
        badgeBorder: '#CBD5E1',
        badgeText: '#475569',
        dotColor: '#94A3B8',
        icon: 'clock',
      };
    case 'ACCEPTED':
      return {
        label: 'Accepted',
        badgeBg: '#ECFDF5',
        badgeBorder: '#A7F3D0',
        badgeText: '#059669',
        dotColor: '#10B981',
        icon: 'check',
      };
    case 'PICKED_UP':
      return {
        label: 'Picked Up',
        badgeBg: '#EFF6FF',
        badgeBorder: '#BFDBFE',
        badgeText: '#1D4ED8',
        dotColor: '#3B82F6',
        icon: 'package',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'Out for Delivery',
        badgeBg: '#FFF7ED',
        badgeBorder: '#FED7AA',
        badgeText: '#C2410C',
        dotColor: '#F97316',
        icon: 'truck',
      };
    case 'DELIVERY_PROOF_PENDING':
      return {
        label: 'Proof Pending',
        badgeBg: '#FEF3C7',
        badgeBorder: '#FDE68A',
        badgeText: '#B45309',
        dotColor: '#F59E0B',
        icon: 'camera',
      };
    case 'DELIVERED':
      return {
        label: 'Delivered',
        badgeBg: '#ECFDF5',
        badgeBorder: '#A7F3D0',
        badgeText: '#059669',
        dotColor: '#10B981',
        icon: 'check-circle',
      };
    case 'DELIVERY_FAILED':
      return {
        label: 'Delivery Failed',
        badgeBg: '#FEF2F2',
        badgeBorder: '#FECACA',
        badgeText: '#DC2626',
        dotColor: '#EF4444',
        icon: 'x-circle',
      };
    default:
      return {
        label: normalized.replace(/_/g, ' '),
        badgeBg: '#F1F5F9',
        badgeBorder: '#E2E8F0',
        badgeText: '#475569',
        dotColor: '#94A3B8',
        icon: 'info',
      };
  }
}

/**
 * Dynamically resolves the available actions for a delivery order from backend workflow.
 * If backend returns `allowedActions` or `actions`, uses them directly;
 * otherwise evaluates the strict state-machine defined in backend `validFlow`.
 */
export function getDeliveryActions(order: any): {
  primaryAction: DeliveryAction | null;
  secondaryAction: DeliveryAction | null;
  allActions: DeliveryAction[];
  isTerminal: boolean;
} {
  const status: DeliveryStatus = (order?.status || 'ASSIGNED').toUpperCase();

  // If backend provides custom dynamic actions array in payload, map them
  if (Array.isArray(order?.allowedActions) && order.allowedActions.length > 0) {
    const actions: DeliveryAction[] = order.allowedActions.map((act: any) => ({
      actionKey: act.key || act.actionKey || 'UPDATE_STATUS',
      nextStatus: act.nextStatus || act.status,
      label: act.label || act.name,
      shortLabel: act.shortLabel || act.label,
      icon: act.icon || 'arrow-right',
      color: act.color || '#2563EB',
      bgColor: act.bgColor || '#EFF6FF',
      isPrimary: Boolean(act.isPrimary),
      requiresConfirmation: Boolean(act.requiresConfirmation),
      confirmationTitle: act.confirmationTitle,
      confirmationMessage: act.confirmationMessage,
    }));
    return {
      primaryAction: actions.find(a => a.isPrimary) || actions[0] || null,
      secondaryAction: actions.length > 1 ? actions[1] : null,
      allActions: actions,
      isTerminal: status === 'DELIVERED' || status === 'DELIVERY_FAILED',
    };
  }

  // Strict backend-aligned state machine
  switch (status) {
    case 'ASSIGNED': {
      const primaryAction: DeliveryAction = {
        actionKey: 'ACCEPT',
        nextStatus: 'ACCEPTED',
        label: 'Accept Order',
        shortLabel: 'Accept',
        icon: 'check-circle',
        color: '#059669',
        bgColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        isPrimary: true,
        requiresConfirmation: false,
      };
      return {
        primaryAction,
        secondaryAction: null,
        allActions: [primaryAction],
        isTerminal: false,
      };
    }

    case 'ACCEPTED': {
      const primaryAction: DeliveryAction = {
        actionKey: 'PICKUP',
        nextStatus: 'PICKED_UP',
        label: 'Pick Up Order (At Store)',
        shortLabel: 'Pick Up',
        icon: 'package',
        color: '#2563EB',
        bgColor: '#EFF6FF',
        borderColor: '#BFDBFE',
        isPrimary: true,
        requiresConfirmation: false,
      };
      return {
        primaryAction,
        secondaryAction: null,
        allActions: [primaryAction],
        isTerminal: false,
      };
    }

    case 'PICKED_UP': {
      const primaryAction: DeliveryAction = {
        actionKey: 'START_DELIVERY',
        nextStatus: 'OUT_FOR_DELIVERY',
        label: 'Start Delivery (Out For Delivery)',
        shortLabel: 'Start Delivery',
        icon: 'truck',
        color: '#D97706',
        bgColor: '#FFFBEB',
        borderColor: '#FDE68A',
        isPrimary: true,
        requiresConfirmation: false,
      };
      return {
        primaryAction,
        secondaryAction: null,
        allActions: [primaryAction],
        isTerminal: false,
      };
    }

    case 'OUT_FOR_DELIVERY':
    case 'DELIVERY_PROOF_PENDING': {
      const primaryAction: DeliveryAction = {
        actionKey: 'COMPLETE_DELIVERY',
        nextStatus: 'DELIVERED',
        label: 'Mark Order Delivered',
        shortLabel: 'Deliver',
        icon: 'check-circle',
        color: '#059669',
        bgColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        isPrimary: true,
      };
      const secondaryAction: DeliveryAction = {
        actionKey: 'REPORT_FAILURE',
        label: 'Report Delivery Issue / Failed',
        shortLabel: 'Report Issue',
        icon: 'alert-triangle',
        color: '#DC2626',
        bgColor: '#FEF2F2',
        borderColor: '#FECACA',
        isPrimary: false,
      };
      return {
        primaryAction,
        secondaryAction,
        allActions: [primaryAction, secondaryAction],
        isTerminal: false,
      };
    }

    case 'DELIVERED':
    case 'DELIVERY_FAILED':
    default:
      return {
        primaryAction: null,
        secondaryAction: null,
        allActions: [],
        isTerminal: true,
      };
  }
}

