import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Order } from '../../types';
import { api } from '../../services/api';

interface OrderInvoiceModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
}

function numberToWords(num: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(Math.abs(Number(num) || 0));
  if (n === 0) return 'Zero Rupees Only';

  function convertGroup(val: number): string {
    if (val === 0) return '';
    if (val < 20) return a[val] + ' ';
    if (val < 100) return b[Math.floor(val / 10)] + ' ' + a[val % 10] + ' ';
    return a[Math.floor(val / 100)] + ' Hundred ' + convertGroup(val % 100);
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  if (crore > 0) words += convertGroup(crore) + 'Crore ';
  if (lakh > 0) words += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) words += convertGroup(thousand) + 'Thousand ';
  if (hundred > 0) words += convertGroup(hundred);

  return words.trim() + ' Rupees Only';
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({
  visible,
  order: propOrder,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [liveOrder, setLiveOrder] = useState<Order | null>(propOrder);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const loadedIdRef = useRef<string | null>(null);

  // Sync fresh order details and store settings from backend ONLY ONCE when modal opens
  useEffect(() => {
    if (visible && propOrder) {
      const targetId = propOrder.id || propOrder.orderNumber || '';
      // Prevent repeated re-fetching and repeated loader flashing
      if (loadedIdRef.current !== targetId) {
        loadedIdRef.current = targetId;
        setLoading(true);
        setLiveOrder(propOrder);

        Promise.all([
          targetId ? api.getOrder(targetId).catch(() => null) : Promise.resolve(null),
          api.getSettings().catch(() => null),
        ])
          .then(([orderRes, settingsRes]) => {
            const fresh = orderRes?.data?.data || orderRes?.data?.order || orderRes?.data;
            if (fresh && (fresh.id || fresh.orderNumber)) {
              setLiveOrder(fresh);
            }
            const setPayload = settingsRes?.data?.data || settingsRes?.data;
            if (setPayload) {
              setStoreSettings(setPayload);
            }
          })
          .finally(() => {
            setLoading(false);
          });
      } else {
        // Already loaded once, silently update order reference without flashing loader
        setLiveOrder(propOrder);
      }
    } else if (!visible) {
      loadedIdRef.current = null;
      setLoading(false);
    }
  }, [visible, propOrder?.id, propOrder?.orderNumber]);

  if (!visible || !liveOrder) return null;

  // Exact fields matching R2Cart-Web template
  const legalEntity = storeSettings?.policies?.legalName || storeSettings?.storeName || 'R2Cart Retail Pvt. Ltd.';
  const storePhone = storeSettings?.contactNumber || storeSettings?.policies?.supportPhone || '+91 9189231317';
  const storeEmail = storeSettings?.email || storeSettings?.policies?.supportEmail || 'r2cartsupport@gmail.com';
  const storeAddress = storeSettings?.address || storeSettings?.policies?.officeAddress || 'Rasulpur, Hathua, Bihar 841436';

  const orderNum = liveOrder.orderNumber || (liveOrder.id ? liveOrder.id.slice(-8).toUpperCase() : '');
  const invoiceNum = `INV-${orderNum}`;

  const orderDate = new Date(liveOrder.date || liveOrder.createdAt || Date.now()).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const printTimestamp = new Date().toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const snap: any = liveOrder.address || (typeof (liveOrder as any).addressSnapshot === 'string'
    ? JSON.parse((liveOrder as any).addressSnapshot || '{}')
    : (liveOrder as any).addressSnapshot) || {};

  const customerName = snap.name || snap.fullName || liveOrder.customer || (liveOrder as any).user?.name || 'Valued Customer';
  const customerMobile = snap.mobile || snap.phone || liveOrder.mobile || (liveOrder as any).user?.mobile || '-';
  const isScheduled = liveOrder.deliveryType === 'SCHEDULED';
  const isCod = liveOrder.paymentMethod === 'COD';

  const items = liveOrder.items || [];
  const grandTotal = Number(liveOrder.total || liveOrder.grandTotal || liveOrder.totalAmount || 0);
  const itemsTotalMrp = items.reduce((acc, it) => acc + (Number(it.mrp || it.price) * (it.quantity || 1)), 0);
  const itemSubtotal = Number(liveOrder.itemTotal || items.reduce((acc, it) => acc + (it.price * it.quantity), 0));
  const productDiscount = Math.max(0, itemsTotalMrp - itemSubtotal);
  const deliveryFee = Number(liveOrder.deliveryFee ?? 0);
  const couponDiscount = Number(liveOrder.couponDiscount || liveOrder.discount || 0);
  const paymentStatus = liveOrder.paymentStatus || (isCod ? 'PAID' : 'PAID');
  const deliverySlotText = liveOrder.deliverySlot || 'Morning Slot (07:00 AM - 10:00 AM)';

  const generateFullInvoiceText = () => {
    const itemsText = items.map((it, idx) => {
      const mrp = Number(it.mrp || it.price).toFixed(2);
      const rate = Number(it.price).toFixed(2);
      const total = (Number(it.price) * (it.quantity || 1)).toFixed(2);
      const sku = (it as any).sku;
      const skuLine = sku ? `\n(${sku})` : '';
      return `${idx + 1}\t${it.name}\n${it.unit || 'Pack'}${skuLine}\n${it.quantity}\t₹${mrp}\t₹${rate}\t₹${total}`;
    }).join('\n\n');

    return `R2Cart\n` +
      `${legalEntity}\n` +
      `Daily Needs, Delivered Fresh.\n` +
      `${storeAddress}\n` +
      `Email: ${storeEmail} | Phone: ${storePhone}\n\n` +
      `RETAIL INVOICE / CASH BILL\n` +
      `Invoice No:\n${invoiceNum}\n` +
      `Invoice Date:\n${orderDate}\n` +
      `Order ID:\n#${orderNum}\n` +
      `Delivery Mode:\n${isScheduled ? `Scheduled (${deliverySlotText})` : 'Express Instant Delivery'}\n` +
      `Payment Method:\n${isCod ? 'Cash on Delivery (COD)' : (liveOrder.paymentMethod || 'Online')}\n` +
      `Payment Status:\n${paymentStatus}\n\n` +
      `BILLED TO / CUSTOMER DETAILS\n` +
      `${customerName}\n` +
      `Phone: ${customerMobile}\n` +
      `Customer ID: ${(liveOrder as any).user?.id || 'GUEST-USER'}\n\n` +
      `SHIPPED TO (DELIVERY ADDRESS)\n` +
      `House/Flat: ${snap.house || snap.houseNo || 'Address on file'}\n` +
      `Street/Colony: ${snap.street || '-'}\n` +
      `Landmark: ${snap.landmark || '-'}\n` +
      `Area / Locality: ${snap.area || snap.villageName || 'Rasulpur'}, ${snap.city || 'Hathua'}\n` +
      `State: Bihar - PIN: ${snap.pin || snap.pincode || '841436'}\n` +
      (liveOrder.deliveryInstruction ? `Delivery Instruction: ${liveOrder.deliveryInstruction}\n` : '') +
      `\n#\tItem Description\tPack Size / SKU\tQty\tMRP (₹)\tUnit Rate (₹)\tTotal (₹)\n` +
      `${itemsText}\n\n` +
      `Amount in Words:\n${numberToWords(grandTotal)}\n\n` +
      `Payment Details:\n` +
      `Mode: ${isCod ? 'Cash on Delivery (COD)' : (liveOrder.paymentMethod || 'Online')}\n` +
      `Payment Status: ${paymentStatus}\n` +
      `Amount to Collect: ${isCod ? `₹${grandTotal.toFixed(2)}` : '₹0.00 (PREPAID)'}\n\n` +
      `Terms & Conditions:\n` +
      `All perishable & grocery items should be verified at the time of doorstep handover.\n` +
      `Returns and refunds are processed per R2Cart standard customer policy.\n` +
      `This is an official computer-generated retail invoice issued by R2Cart (${legalEntity}).\n\n` +
      `Items Total (at MRP)\n₹${itemsTotalMrp.toFixed(2)}\n` +
      (productDiscount > 0 ? `Product Discounts\n-₹${productDiscount.toFixed(2)}\n` : '') +
      (couponDiscount > 0 ? `Coupon Discount\n-₹${couponDiscount.toFixed(2)}\n` : '') +
      `Delivery & Packaging Fee\n${deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}\n` +
      `Grand Total (INR):\n₹${grandTotal.toFixed(2)}\n` +
      `(All prices in INR | Net Final Payable)\n\n` +
      `Authorized Signatory\nFor R2Cart (${legalEntity})\n\n` +
      `R2Cart | ${legalEntity} | ${storeAddress} | Support: ${storeEmail}\n` +
      `Page 1 of 1 | Generated on ${printTimestamp}`;
  };

  const handleShareInvoice = async () => {
    try {
      const fullText = generateFullInvoiceText();
      await Share.share({
        title: `Invoice #${invoiceNum}`,
        message: fullText,
      });
      if (Platform.OS === 'android') {
        ToastAndroid.show('Official Invoice shared successfully', ToastAndroid.SHORT);
      }
    } catch {}
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.invoiceSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Top Control Bar */}
          <View style={styles.topActionsRow}>
            <View style={styles.titleWithIcon}>
              <View style={styles.invoiceIconBox}>
                <Feather name="file-text" size={17} color="#059669" />
              </View>
              <View>
                <Text style={styles.sheetHeading}>Official Tax Invoice</Text>
                <Text style={styles.sheetSubheading}>#{invoiceNum}</Text>
              </View>
            </View>
            <View style={styles.rightBtnsRow}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShareInvoice}
                activeOpacity={0.8}
              >
                <Feather name="share-2" size={13} color="#059669" style={{ marginRight: 4 }} />
                <Text style={styles.shareBtnText}>Share / Save</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Website-Style Exact A4 Sheet Preview */}
          <ScrollView
            style={styles.invoiceScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.a4Paper}>
              {/* Header: Brand Details (Stacked & Clean) */}
              <View style={styles.storeBrandBlock}>
                <Text style={styles.brandTitle}>R2Cart</Text>
                <Text style={styles.companyName}>{legalEntity}</Text>
                <Text style={styles.brandTagline}>Daily Needs, Delivered Fresh.</Text>
                <Text style={styles.storeAddrText}>{storeAddress}</Text>
                <Text style={styles.storeMetaText}>Email: {storeEmail} | Phone: {storePhone}</Text>
              </View>

              <View style={styles.divider} />

              {/* RETAIL INVOICE / CASH BILL Badge & Meta Information Card */}
              <View style={styles.invoiceMetaCard}>
                <View style={styles.docTypeBadgeWrap}>
                  <View style={styles.docTypeBadge}>
                    <Text style={styles.docTypeText}>RETAIL INVOICE / CASH BILL</Text>
                  </View>
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Invoice No:</Text>
                    <Text style={styles.metaValBold}>{invoiceNum}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Invoice Date:</Text>
                    <Text style={styles.metaVal}>{orderDate}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Order ID:</Text>
                    <Text style={styles.metaValBold}>#{orderNum}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Delivery Mode:</Text>
                    <Text style={styles.metaVal}>
                      {isScheduled ? `Scheduled (${deliverySlotText})` : 'Express Instant Delivery'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Payment Method:</Text>
                    <Text style={styles.metaVal}>
                      {isCod ? 'Cash on Delivery (COD)' : (liveOrder.paymentMethod || 'Online')}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Payment Status:</Text>
                    <Text style={[styles.metaValBold, { color: paymentStatus === 'PAID' ? '#059669' : '#D97706' }]}>
                      {paymentStatus}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Parties Details (Billed To & Shipped To) */}
              <View style={styles.partiesGrid}>
                {/* Billed To */}
                <View style={styles.partyBox}>
                  <Text style={styles.partyBoxTitle}>BILLED TO / CUSTOMER DETAILS</Text>
                  <Text style={styles.partyName}>{customerName}</Text>
                  <Text style={styles.partyRow}>Phone: <Text style={styles.partyBold}>{customerMobile}</Text></Text>
                  {(liveOrder as any).user?.email ? (
                    <Text style={styles.partyRow}>Email: {(liveOrder as any).user.email}</Text>
                  ) : null}
                  <Text style={styles.partyRow}>Customer ID: {(liveOrder as any).user?.id || 'GUEST-USER'}</Text>
                </View>

                {/* Shipped To */}
                <View style={[styles.partyBox, { marginTop: 8 }]}>
                  <Text style={styles.partyBoxTitle}>SHIPPED TO (DELIVERY ADDRESS)</Text>
                  <Text style={styles.partyAddressLine}>House/Flat: {snap.house || snap.houseNo || 'Address on file'}</Text>
                  <Text style={styles.partyAddressLine}>Street/Colony: {snap.street || '-'}</Text>
                  {snap.landmark ? <Text style={styles.partyAddressLine}>Landmark: {snap.landmark}</Text> : null}
                  <Text style={styles.partyAddressLine}>Area / Locality: {snap.area || snap.villageName || 'Rasulpur'}, {snap.city || 'Hathua'}</Text>
                  <Text style={styles.partyAddressLine}>State: Bihar - PIN: {snap.pin || snap.pincode || '841436'}</Text>
                  {liveOrder.deliveryInstruction ? (
                    <Text style={styles.partyInstruction}>
                      Delivery Instruction: {liveOrder.deliveryInstruction}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Itemized Table - Clear Structured Cards Layout (Never Misaligned) */}
              <View style={styles.tableTitleRow}>
                <Text style={styles.tableSectionTitle}>ITEMIZED PARTICULARS</Text>
                <Text style={styles.tableItemsCount}>{items.length} item{items.length === 1 ? '' : 's'}</Text>
              </View>

              {items.map((it, idx) => {
                const mrp = Number(it.mrp || it.price).toFixed(2);
                const unitPrice = Number(it.price).toFixed(2);
                const lineTotal = (Number(it.price) * (it.quantity || 1)).toFixed(2);
                const sku = (it as any).sku;

                return (
                  <View key={it.id || idx} style={styles.itemCardRow}>
                    <View style={styles.itemNumBadge}>
                      <Text style={styles.itemNumText}>{idx + 1}</Text>
                    </View>

                    <View style={{ flex: 1, paddingHorizontal: 8 }}>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={styles.itemPackText}>{it.unit || 'Pack'}</Text>
                      {sku ? <Text style={styles.itemSkuText}>({sku})</Text> : null}

                      <View style={styles.itemQtyRateRow}>
                        <Text style={styles.itemQtyBadge}>Qty: {it.quantity}</Text>
                        <Text style={styles.itemRateText}>Rate: ₹{unitPrice}</Text>
                        <Text style={styles.itemMrpText}>MRP: ₹{mrp}</Text>
                      </View>
                    </View>

                    <View style={styles.itemTotalCol}>
                      <Text style={styles.itemTotalLabel}>TOTAL</Text>
                      <Text style={styles.itemTotalValue}>₹{lineTotal}</Text>
                    </View>
                  </View>
                );
              })}

              <View style={styles.divider} />

              {/* Bottom Financial & Terms Section */}
              <View style={styles.bottomSection}>
                {/* Amount in Words */}
                <View style={styles.wordsBox}>
                  <Text style={styles.wordsLabel}>Amount in Words:</Text>
                  <Text style={styles.wordsValue}>{numberToWords(grandTotal)}</Text>
                </View>

                {/* Payment Details */}
                <View style={styles.paymentBox}>
                  <Text style={styles.paymentBoxTitle}>Payment Details:</Text>
                  <Text style={styles.paymentBoxRow}>Mode: {isCod ? 'Cash on Delivery (COD)' : (liveOrder.paymentMethod || 'Online')}</Text>
                  <Text style={styles.paymentBoxRow}>Payment Status: {paymentStatus}</Text>
                  <Text style={styles.paymentBoxRow}>Amount to Collect: {isCod ? `₹${grandTotal.toFixed(2)}` : '₹0.00 (PREPAID)'}</Text>
                </View>

                {/* Terms & Conditions */}
                <View style={styles.termsBox}>
                  <Text style={styles.termsTitle}>Terms & Conditions:</Text>
                  <Text style={styles.termItem}>- All perishable & grocery items should be verified at the time of doorstep handover.</Text>
                  <Text style={styles.termItem}>- Returns and refunds are processed per R2Cart standard customer policy.</Text>
                  <Text style={styles.termItem}>- This is an official computer-generated retail invoice issued by R2Cart ({legalEntity}).</Text>
                </View>

                <View style={styles.divider} />

                {/* Totals Table */}
                <View style={styles.totalsTable}>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Items Total (at MRP)</Text>
                    <Text style={styles.totalsValue}>₹{itemsTotalMrp.toFixed(2)}</Text>
                  </View>

                  {productDiscount > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: '#059669' }]}>Product Discounts</Text>
                      <Text style={[styles.totalsValue, { color: '#059669' }]}>-₹{productDiscount.toFixed(2)}</Text>
                    </View>
                  )}

                  {couponDiscount > 0 && (
                    <View style={styles.totalsRow}>
                      <Text style={[styles.totalsLabel, { color: '#059669' }]}>Coupon Discount</Text>
                      <Text style={[styles.totalsValue, { color: '#059669', fontWeight: '700' }]}>-₹{couponDiscount.toFixed(2)}</Text>
                    </View>
                  )}

                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Delivery & Packaging Fee</Text>
                    <Text style={[styles.totalsValue, deliveryFee === 0 && { color: '#059669', fontWeight: '700' }]}>
                      {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}
                    </Text>
                  </View>

                  <View style={styles.grandTotalRow}>
                    <Text style={styles.grandTotalLabel}>Grand Total (INR):</Text>
                    <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.taxNoteText}>
                    (All prices in INR | Net Final Payable)
                  </Text>
                </View>

                {/* Authorized Signatory */}
                <View style={styles.signatoryBox}>
                  <View style={styles.signLine} />
                  <Text style={styles.signatoryTitle}>Authorized Signatory</Text>
                  <Text style={styles.signatoryCompany}>For R2Cart ({legalEntity})</Text>
                </View>

                {/* Footer Note */}
                <View style={styles.footerNote}>
                  <Text style={styles.footerNoteText}>
                    R2Cart | {legalEntity} | {storeAddress} | Support: {storeEmail}
                  </Text>
                  <Text style={styles.footerPageText}>
                    Page 1 of 1 | Generated on {printTimestamp}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  invoiceSheet: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '94%',
    minHeight: '85%',
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoiceIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sheetHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sheetSubheading: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
    marginTop: 1,
  },
  rightBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
  },
  invoiceScroll: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  a4Paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24,
  },
  storeBrandBlock: {
    alignItems: 'flex-start',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -0.5,
  },
  companyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  brandTagline: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
    marginVertical: 2,
  },
  storeAddrText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 2,
  },
  storeMetaText: {
    fontSize: 10.5,
    color: '#475569',
    marginTop: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  invoiceMetaCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  docTypeBadgeWrap: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  docTypeBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  docTypeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.5,
  },
  metaGrid: {
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 1.5,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  metaVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  metaValBold: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '800',
    flex: 1.5,
    textAlign: 'right',
  },
  partiesGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  partyBox: {
    marginBottom: 4,
  },
  partyBoxTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  partyRow: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  partyBold: {
    fontWeight: '700',
    color: '#0F172A',
  },
  partyAddressLine: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 15,
    marginTop: 1,
  },
  partyInstruction: {
    fontSize: 10.5,
    color: '#059669',
    fontWeight: '700',
    marginTop: 4,
  },
  tableTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  tableItemsCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  itemCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  itemNumBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  itemName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 15,
  },
  itemPackText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 1,
  },
  itemSkuText: {
    fontSize: 8.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  itemQtyRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  itemQtyBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemRateText: {
    fontSize: 10,
    color: '#334155',
    fontWeight: '600',
  },
  itemMrpText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  itemTotalCol: {
    alignItems: 'flex-end',
    minWidth: 65,
  },
  itemTotalLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94A3B8',
  },
  itemTotalValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  bottomSection: {
    marginTop: 4,
  },
  wordsBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  wordsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  wordsValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#047857',
    marginTop: 3,
  },
  paymentBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  paymentBoxTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 3,
  },
  paymentBoxRow: {
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 15,
  },
  termsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  termsTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 4,
  },
  termItem: {
    fontSize: 9,
    color: '#64748B',
    lineHeight: 13,
    marginVertical: 1,
  },
  totalsTable: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalsLabel: {
    fontSize: 11,
    color: '#475569',
  },
  totalsValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.5,
    borderTopColor: '#0F172A',
    borderBottomWidth: 1.5,
    borderBottomColor: '#0F172A',
    paddingVertical: 8,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#0F172A',
  },
  grandTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  taxNoteText: {
    fontSize: 9,
    color: '#059669',
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 3,
  },
  signatoryBox: {
    alignItems: 'flex-end',
    marginTop: 20,
    marginBottom: 12,
  },
  signLine: {
    width: 140,
    height: 1,
    backgroundColor: '#94A3B8',
    marginBottom: 4,
  },
  signatoryTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  signatoryCompany: {
    fontSize: 9.5,
    color: '#64748B',
  },
  footerNote: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 8.5,
    color: '#94A3B8',
    textAlign: 'center',
  },
  footerPageText: {
    fontSize: 8,
    color: '#94A3B8',
    marginTop: 2,
  },
});
