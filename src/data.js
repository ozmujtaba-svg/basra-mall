import accessoriesImage from "./assets/marketplace/accessories.jpg"
import clothingImage from "./assets/marketplace/clothing.jpg"
import cosmeticsImage from "./assets/marketplace/cosmetics.jpg"
import perfumeImage from "./assets/marketplace/perfume.jpg"
import shoesImage from "./assets/marketplace/shoes.jpg"

export const categoryImages = {
  ملابس: clothingImage,
  كوزمتك: cosmeticsImage,
  عطور: perfumeImage,
  أحذية: shoesImage,
  إكسسوارات: accessoriesImage,
}

export const accountDetails = {
  زبون: "يتصفح المتاجر، يشتري المنتجات، ويتابع الطلب من لحظة الشراء إلى التوصيل.",
  "صاحب متجر": "يسجل متجره، يضيف المنتجات، يحدد الأسعار والكميات، ويستلم الطلبات.",
  سائق: "يستلم طلبات التوصيل من المحلات ويوصلها للزبائن داخل البصرة.",
  الإدارة: "تراقب الطلبات، تتابع التوصيل، وتشوف ربح العمولة وأجرة التوصيل.",
}

export const dashboardData = {
  زبون: {
    title: "واجهة الزبون",
    subtitle: "هنا يبدأ الزبون جولته داخل مول البصرة.",
    stats: [
      { label: "متاجر متاحة", value: "5" },
      { label: "منتجات بالسلة", value: "2" },
      { label: "طلب قيد التوصيل", value: "1" },
    ],
    note: "المرحلة القادمة نضيف متاجر حقيقية ومنتجات تجريبية داخل هذه الواجهة.",
  },
  "صاحب متجر": {
    title: "واجهة صاحب المتجر",
    subtitle: "هنا يدير صاحب المتجر بضاعته وطلباته.",
    stats: [
      { label: "منتجات مضافة", value: "12" },
      { label: "طلبات جديدة", value: "3" },
      { label: "منتجات قليلة الكمية", value: "4" },
    ],
    note: "بعدها نضيف نموذج إضافة منتج يحتوي الاسم، السعر، الكمية، والصورة.",
  },
  سائق: {
    title: "واجهة السائق",
    subtitle: "هنا يشوف السائق طلبات التوصيل داخل البصرة.",
    stats: [
      { label: "طلبات متاحة", value: "4" },
      { label: "طلب مستلم", value: "1" },
      { label: "مناطق التوصيل", value: "3" },
    ],
    note: "الخطوة القادمة نوضح مسار الطلب: من المحل إلى الزبون مع حالة التوصيل.",
  },
  الإدارة: {
    title: "واجهة الإدارة",
    subtitle: "هنا تشوف حركة المول والطلبات والربح التجريبي.",
    stats: [
      { label: "كل الطلبات", value: "0" },
      { label: "قيد التوصيل", value: "0" },
      { label: "ربح تجريبي", value: "0 د.ع" },
    ],
    note: "هذه لوحة إدارة تجريبية. لاحقًا نربطها بحسابات وعمولات حقيقية.",
  },
}

export const customerStores = [
  {
    name: "بوتيك شط العرب",
    category: "ملابس",
    area: "العشار",
    phone: "07700000001",
    ownerName: "إدارة بوتيك شط العرب",
    ownerPhone: "07700000001",
    status: "approved",
    image: categoryImages["ملابس"],
    description: "ملابس يومية ومناسبات مختارة للزبائن داخل البصرة.",
    products: [
      { name: "قميص كتان", price: "35,000 د.ع", quantity: 8, image: categoryImages["ملابس"] },
      { name: "فستان صيفي", price: "58,000 د.ع", quantity: 5, image: categoryImages["ملابس"] },
      { name: "جاكيت خفيف", price: "72,000 د.ع", quantity: 3, image: categoryImages["ملابس"] },
    ],
  },
  {
    name: "لمسة كوزمتك",
    category: "كوزمتك",
    area: "الجزائر",
    phone: "07700000002",
    ownerName: "إدارة لمسة كوزمتك",
    ownerPhone: "07700000002",
    status: "approved",
    image: categoryImages["كوزمتك"],
    description: "مكياج وعناية بالبشرة مع منتجات مناسبة للاستخدام اليومي.",
    products: [
      { name: "روج مطفي", price: "12,000 د.ع", quantity: 10, image: categoryImages["كوزمتك"] },
      { name: "كريم ترطيب", price: "18,000 د.ع", quantity: 6, image: categoryImages["كوزمتك"] },
      { name: "ماسكارا", price: "15,000 د.ع", quantity: 4, image: categoryImages["كوزمتك"] },
    ],
  },
  {
    name: "عطور البصرة",
    category: "عطور",
    area: "البراضعية",
    phone: "07700000003",
    ownerName: "إدارة عطور البصرة",
    ownerPhone: "07700000003",
    status: "approved",
    image: categoryImages["عطور"],
    description: "عطور شرقية وغربية وبخور ومجموعات هدايا.",
    products: [
      { name: "عطر شرقي", price: "45,000 د.ع", quantity: 7, image: categoryImages["عطور"] },
      { name: "بخور فاخر", price: "20,000 د.ع", quantity: 12, image: categoryImages["عطور"] },
      { name: "مجموعة هدية", price: "65,000 د.ع", quantity: 2, image: categoryImages["عطور"] },
    ],
  },
  {
    name: "خطوة للأحذية",
    category: "أحذية",
    area: "المعقل",
    phone: "07700000004",
    ownerName: "إدارة خطوة للأحذية",
    ownerPhone: "07700000004",
    status: "approved",
    image: categoryImages["أحذية"],
    description: "أحذية رياضية ورسمية وصنادل للموسم.",
    products: [
      { name: "حذاء رياضي", price: "55,000 د.ع", quantity: 6, image: categoryImages["أحذية"] },
      { name: "حذاء رسمي", price: "70,000 د.ع", quantity: 4, image: categoryImages["أحذية"] },
      { name: "صندل يومي", price: "28,000 د.ع", quantity: 9, image: categoryImages["أحذية"] },
    ],
  },
  {
    name: "إكسسوارات كورنيش",
    category: "إكسسوارات",
    area: "الكورنيش",
    phone: "07700000005",
    ownerName: "إدارة إكسسوارات كورنيش",
    ownerPhone: "07700000005",
    status: "approved",
    image: categoryImages["إكسسوارات"],
    description: "حقائب وساعات ونظارات وقطع تكمل الإطلالة.",
    products: [
      { name: "حقيبة يد", price: "42,000 د.ع", quantity: 5, image: categoryImages["إكسسوارات"] },
      { name: "ساعة بسيطة", price: "38,000 د.ع", quantity: 3, image: categoryImages["إكسسوارات"] },
      { name: "نظارة شمسية", price: "25,000 د.ع", quantity: 8, image: categoryImages["إكسسوارات"] },
    ],
  },
]
