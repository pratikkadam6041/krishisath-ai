export function localize(value, language = 'hi') {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[language] ?? value.hi ?? value.mr ?? value.en ?? '';
}

export function toInitials(name = 'Farmer') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function maskPhone(phoneNumber = '') {
  if (phoneNumber.length < 4) return phoneNumber;
  return `+91 ••••••${phoneNumber.slice(-4)}`;
}

export function formatClock(value = new Date(), language = 'hi') {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : language === 'mr' ? 'mr-IN' : 'hi-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
}

export function formatDateLong(value = new Date(), language = 'hi') {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : language === 'mr' ? 'mr-IN' : 'hi-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  }).format(value);
}

export function formatDateShort(value = new Date(), language = 'hi') {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-IN' : language === 'mr' ? 'mr-IN' : 'hi-IN', {
    day: 'numeric',
    month: 'short',
  }).format(value);
}

export function formatRelativeTime(timestamp, language = 'hi') {
  if (!timestamp) {
    return localize(
      { hi: 'डेटा उपलब्ध नहीं', mr: 'डेटा उपलब्ध नाही', en: 'No data yet' },
      language
    );
  }

  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) {
    return localize({ hi: 'अभी', mr: 'आत्ताच', en: 'Just now' }, language);
  }

  if (minutes < 60) {
    return localize(
      { hi: `${minutes} मिनट पहले`, mr: `${minutes} मिनिटांपूर्वी`, en: `${minutes} min ago` },
      language
    );
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return localize(
      { hi: `${hours} घंटे पहले`, mr: `${hours} तासांपूर्वी`, en: `${hours} hrs ago` },
      language
    );
  }

  const days = Math.floor(hours / 24);
  return localize(
    { hi: `${days} दिन पहले`, mr: `${days} दिवसांपूर्वी`, en: `${days} days ago` },
    language
  );
}

export function getMoistureMeta(moisture = 0, language = 'hi') {
  if (moisture < 40) {
    return {
      status: 'critical',
      color: '#dc2626',
      softColor: 'bg-red-50 text-red-700',
      label: localize({ hi: 'पानी दें', mr: 'पाणी द्या', en: 'Needs water' }, language),
      description: localize(
        {
          hi: 'मिट्टी सूख रही है, सिंचाई की जरूरत है।',
          mr: 'माती कोरडी होत आहे, पाण्याची गरज आहे.',
          en: 'Soil is running dry and irrigation is recommended.',
        },
        language
      ),
    };
  }

  if (moisture <= 60) {
    return {
      status: 'watch',
      color: '#f59e0b',
      softColor: 'bg-amber-50 text-amber-700',
      label: localize({ hi: 'नज़र रखें', mr: 'लक्ष ठेवा', en: 'Watch closely' }, language),
      description: localize(
        {
          hi: 'नमी ठीक है, अगले कुछ घंटों में दोबारा देखें।',
          mr: 'ओलावा ठीक आहे, काही तासांनी पुन्हा तपासा.',
          en: 'Moisture is manageable. Recheck in a few hours.',
        },
        language
      ),
    };
  }

  if (moisture <= 80) {
    return {
      status: 'optimal',
      color: '#16a34a',
      softColor: 'bg-emerald-50 text-emerald-700',
      label: localize({ hi: 'सही स्तर', mr: 'योग्य पातळी', en: 'Optimal' }, language),
      description: localize(
        {
          hi: 'मिट्टी की नमी फसल के लिए अच्छी है।',
          mr: 'मातीतील ओलावा पिकासाठी चांगला आहे.',
          en: 'Moisture level looks healthy for the crop.',
        },
        language
      ),
    };
  }

  return {
    status: 'high',
    color: '#2563eb',
    softColor: 'bg-blue-50 text-blue-700',
    label: localize({ hi: 'ज्यादा गीला', mr: 'जास्त ओलसर', en: 'Too wet' }, language),
    description: localize(
      {
        hi: 'मिट्टी ज्यादा गीली है, अभी पानी न दें।',
        mr: 'माती खूप ओली आहे, आत्ता पाणी देऊ नका.',
        en: 'Soil is already wet. Hold irrigation for now.',
      },
      language
    ),
  };
}

export function getSyncMeta(timestamp, language = 'hi') {
  if (!timestamp) {
    return {
      tone: 'bg-slate-100 text-slate-600',
      label: localize({ hi: 'डेटा लंबित', mr: 'डेटा प्रलंबित', en: 'Waiting for data' }, language),
    };
  }

  const ageMinutes = Math.floor((Date.now() - timestamp) / 60000);

  if (ageMinutes < 5) {
    return {
      tone: 'bg-emerald-100 text-emerald-700',
      label: localize(
        { hi: `LIVE · ${formatRelativeTime(timestamp, language)}`, mr: `LIVE · ${formatRelativeTime(timestamp, language)}`, en: `LIVE · ${formatRelativeTime(timestamp, language)}` },
        language
      ),
    };
  }

  if (ageMinutes < 30) {
    return {
      tone: 'bg-lime-100 text-lime-700',
      label: localize(
        {
          hi: `${formatRelativeTime(timestamp, language)}`,
          mr: `${formatRelativeTime(timestamp, language)}`,
          en: `${formatRelativeTime(timestamp, language)}`,
        },
        language
      ),
    };
  }

  if (ageMinutes < 360) {
    return {
      tone: 'bg-amber-100 text-amber-700',
      label: localize(
        {
          hi: `पुराना डेटा · ${formatRelativeTime(timestamp, language)}`,
          mr: `जुना डेटा · ${formatRelativeTime(timestamp, language)}`,
          en: `Cached · ${formatRelativeTime(timestamp, language)}`,
        },
        language
      ),
    };
  }

  return {
    tone: 'bg-red-100 text-red-700',
    label: localize(
      {
        hi: 'डेटा पुराना है',
        mr: 'डेटा जुना आहे',
        en: 'Stale data',
      },
      language
    ),
  };
}

export function formatArea(acres = 0, unit = 'acre', language = 'hi') {
  const rounded = Number(acres || 0);

  if (unit === 'bigha') {
    const value = rounded * 1.6;
    return `${value.toFixed(1)} ${localize({ hi: 'बीघा', mr: 'बिघा', en: 'bigha' }, language)}`;
  }

  if (unit === 'guntha') {
    const value = rounded * 40;
    return `${value.toFixed(0)} ${localize({ hi: 'गुंठा', mr: 'गुंठा', en: 'guntha' }, language)}`;
  }

  return `${rounded.toFixed(1)} ${localize({ hi: 'एकड़', mr: 'एकर', en: 'acre' }, language)}`;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function groupByDateLabel(items = [], language = 'hi') {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 24 * 60 * 60 * 1000;
  const startWeek = startToday - 7 * 24 * 60 * 60 * 1000;

  const labels = {
    today: localize({ hi: 'आज', mr: 'आज', en: 'Today' }, language),
    yesterday: localize({ hi: 'कल', mr: 'काल', en: 'Yesterday' }, language),
    week: localize({ hi: 'इस सप्ताह', mr: 'या आठवड्यात', en: 'This Week' }, language),
  };

  return [
    {
      key: 'today',
      label: labels.today,
      items: items.filter((item) => item.timestamp >= startToday),
    },
    {
      key: 'yesterday',
      label: labels.yesterday,
      items: items.filter((item) => item.timestamp >= startYesterday && item.timestamp < startToday),
    },
    {
      key: 'week',
      label: labels.week,
      items: items.filter((item) => item.timestamp >= startWeek && item.timestamp < startYesterday),
    },
  ].filter((group) => group.items.length > 0);
}

export function createTrendSeries(seedValue = 50, variance = 6, count = 7, min = 0, max = 100) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 1.15) * variance;
    const tilt = (index - count / 2) * 0.9;
    return Math.max(min, Math.min(max, Math.round(seedValue + wave + tilt)));
  });
}
