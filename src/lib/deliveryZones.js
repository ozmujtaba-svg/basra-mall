export const BASRA_DELIVERY_ZONES = [
  "العشار",
  "الجزائر",
  "بريهة",
  "البراضعية",
  "الطويسة",
  "الرباط",
  "القبلة",
  "الجمهورية",
  "الحيانية",
  "خمسة ميل",
  "المعقل",
  "الزبير",
  "أبو الخصيب",
  "القرنة",
  "المدينة",
  "شط العرب",
]

export const DEFAULT_DELIVERY_FEES = {
  العشار: 3000,
  الجزائر: 3000,
  بريهة: 3000,
  البراضعية: 3000,
  الطويسة: 3500,
  الرباط: 3500,
  القبلة: 4000,
  الجمهورية: 4000,
  الحيانية: 4000,
  "خمسة ميل": 4500,
  المعقل: 4500,
  الزبير: 7000,
  "أبو الخصيب": 7000,
  القرنة: 10000,
  المدينة: 12000,
  "شط العرب": 8000,
}

export function getDeliveryFeeForArea(area, deliveryFees, fallbackFee = 5000) {
  const configuredFee = Number(deliveryFees?.[area])
  return Number.isFinite(configuredFee) ? configuredFee : fallbackFee
}
