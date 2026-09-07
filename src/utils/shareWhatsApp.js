/**
 * WhatsApp share utility
 * Uses wa.me deep-link — works on mobile and desktop
 */
export function shareWhatsApp(text) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export function shareMandiPrice({ cropName, price, unit, mandi, change }) {
  const sign = change > 0 ? `↑₹${change}` : change < 0 ? `↓₹${Math.abs(change)}` : 'Unchanged';
  const text = `🌾 *KrishiSarth मंडी भाव*\n\n*${cropName}*\n💰 ₹${price}/${unit}\n📊 ${sign} आज\n📍 ${mandi}\n\nKrishiSarth ऐप से जानें और बेहतर दाम पाएं 🚜`;
  shareWhatsApp(text);
}

export function shareScanResult({ disease, confidence, treatment }) {
  const text = `🌿 *KrishiSarth AI स्कैन परिणाम*\n\n🔬 बीमारी: *${disease}*\n📊 विश्वास: ${confidence}\n\n💊 उपचार:\n${treatment}\n\nKrishiSarth ऐप से AI स्कैन करें 🌱`;
  shareWhatsApp(text);
}

export function shareScheme({ schemeName, description, deadline }) {
  const text = `🏛️ *सरकारी योजना — KrishiSarth*\n\n📋 *${schemeName}*\n${description}\n${deadline ? `⏰ अंतिम तिथि: ${deadline}` : ''}\n\nKrishiSarth ऐप से योजना की जानकारी पाएं 📱`;
  shareWhatsApp(text);
}
