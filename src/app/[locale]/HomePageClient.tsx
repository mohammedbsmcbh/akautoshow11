'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { ScrollReveal } from '@/components/ScrollReveal';
import { Preloader } from '@/components/Preloader';
import { InteractiveGallery } from '@/components/InteractiveGallery';
import ChatwayWidget from '@/components/ChatwayWidget';

// Countdown Timer Component
function CountdownTimer({ targetDate, labels }: { targetDate: Date, labels: any }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      
      if (distance < 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      };
    };

    setTimeLeft(calculateTime()); // Initial set

    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const TimeBox = ({ value, label }: { value: number, label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-black/50 backdrop-blur-sm border border-[#deb887]/30 rounded-lg p-3 w-20 md:w-24 h-20 md:h-24 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(222,184,135,0.1)]">
        <span className="text-2xl md:text-3xl font-bold text-[#deb887] font-mono">
          {value.toString().padStart(2, '0')}
        </span>
      </div>
      <span className="text-gray-400 text-xs md:text-sm uppercase tracking-wider">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6 my-8" dir="ltr">
      <TimeBox value={timeLeft.days} label={labels.days} />
      <TimeBox value={timeLeft.hours} label={labels.hours} />
      <TimeBox value={timeLeft.minutes} label={labels.minutes} />
      <TimeBox value={timeLeft.seconds} label={labels.seconds} />
    </div>
  );
}

// Language Switcher Component
function LanguageSwitcher() {
  const [currentLoc, setCurrentLoc] = useState('en');
  
  useEffect(() => {
    const urlPath = window.location.pathname;
    if (urlPath.includes('/ar')) {
      setCurrentLoc('ar');
    } else {
      setCurrentLoc('en'); 
    }
  }, []);return (
    <div className="flex items-center gap-2">      <Link
        href="/en"        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
          currentLoc === 'en' 
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg' 
            : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        English
      </Link>
      <span className="text-gray-500">|</span>
      <Link 
        href="/ar"        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
          currentLoc === 'ar' 
            ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg' 
            : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
        }`}
      >
        العربية
      </Link>
    </div>
  );
}

export default function HomePageClient({ events }: { events: any[] }) {
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentLocale, setCurrentLocale] = useState('en');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [heroLogoOk, setHeroLogoOk] = useState(true);
  const [announcementDismissed, setAnnouncementDismissed] = useState(true);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('round3-announcement-dismissed');
    if (!dismissed) setAnnouncementDismissed(false);
  }, []);

  const dismissAnnouncement = () => {
    sessionStorage.setItem('round3-announcement-dismissed', '1');
    setAnnouncementDismissed(true);
  };
  
  const heroVideoSrc = '/home-hero.mp4';
  const primaryEventId = '5';
  
  useEffect(() => {
    // Force detection from URL
    const urlPath = window.location.pathname;
    console.log('🔍 URL Path:', urlPath);
    
    if (urlPath.includes('/ar')) {
      setCurrentLocale('ar');
      console.log('🎯 Detected Arabic from URL');
    } else {
      setCurrentLocale('en');
      console.log('🎯 Using English');
    }
  }, []);

  // Preloader effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 3000); // 3 seconds total (2.5s delay + 0.5s fade)

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadSponsors = async () => {
      try {
        const response = await fetch('/api/sponsors');
        const result = await response.json();

        if (result.success) {
           const activeSponsors = (result.sponsors || []).filter((s: any) => s.is_active);
           setSponsors(activeSponsors);
        }
      } catch (error) {
        console.error('Error loading sponsors:', error);
      }
    };

    loadSponsors();
  }, []);

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;

    let cleanedUp = false;

    const tryPlayWithSound = async () => {
      try {
        video.muted = false;
        video.volume = 1;
        await video.play();
        return true;
      } catch {
        return false;
      }
    };

    const tryPlayMuted = async () => {
      try {
        video.muted = true;
        await video.play();
        return true;
      } catch {
        return false;
      }
    };

    const enableSoundOnFirstGesture = () => {
      if (cleanedUp) return;
      const v = heroVideoRef.current;
      if (!v) return;
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {
        // ignore
      });
      window.removeEventListener('pointerdown', enableSoundOnFirstGesture);
      window.removeEventListener('touchstart', enableSoundOnFirstGesture);
      window.removeEventListener('keydown', enableSoundOnFirstGesture);
    };

    (async () => {
      const playedWithSound = await tryPlayWithSound();
      if (playedWithSound) return;

      const playedMuted = await tryPlayMuted();
      if (playedMuted) {
        window.addEventListener('pointerdown', enableSoundOnFirstGesture, { once: true });
        window.addEventListener('touchstart', enableSoundOnFirstGesture, { once: true });
        window.addEventListener('keydown', enableSoundOnFirstGesture, { once: true });
      }
    })();

    return () => {
      cleanedUp = true;
      window.removeEventListener('pointerdown', enableSoundOnFirstGesture);
      window.removeEventListener('touchstart', enableSoundOnFirstGesture);
      window.removeEventListener('keydown', enableSoundOnFirstGesture);
    };
  }, []);
  
  // Use the state locale instead of useLocale
  const activeLocale = currentLocale;
  const isRTL = activeLocale === 'ar';
  
  // Direct translation objects
  const translations = {
    ar: {
      nav: {
        events: 'الفعاليات',
        gallery: 'المعرض', 
        about: 'نبذة عنا',
        register: 'التسجيل'
      },
      hero: {
        title: 'فعالية الدرفت',
        patronage: '',
        description: 'سجل الآن للمشاركة في فعالية الدرفت.',
        registerNow: 'سجل الآن',
        learnMore: 'اعرف المزيد'
      },
      events: {
        title: 'الفعاليات القادمة',
        showcase: 'عرض السيارات',
        showcaseDesc: 'اعرض مركبتك',
        competition: 'المسابقة',
        competitionDesc: 'اربح جوائز مذهلة',
        networking: 'التواصل',
        networkingDesc: 'التق بزملاء المهنة',
        food: 'الطعام والشراب',
        foodDesc: 'استمتع بالمرطبات'
      },
      sponsors: {
        title: 'شركاء النجاح',
        subtitle: 'نفخر بشراكتنا مع نخبة من اقوى الشركات والمؤسسات',
        diamond: 'الراعي الماسي',
        gold: 'الراعي الذهبي',
        silver: 'الراعي الفضي'
      },
      gallery: {
        title: 'معرض الفعاليات',
        subtitle: 'ذكريات من فعالياتنا السابقة'
      },
      about: {
        title: '  AKAutoshow نبذة عن ',
        description: 'AKAutoshow هي المنصة الرائدة لمحبي السيارات في الشرق الأوسط. ننظم معارض ولقاءات سيارات حصرية تجمع أكثر محبي السيارات شغفاً ومركباتهم المذهلة.',
        mission: 'مهمتنا',
        missionText: 'خلق تجارب سيارات لا تُنسى تحتفي بثقافة السيارات وتبني صلات دائمة داخل المجتمع.',
        events: 'فعالية نظمت',
        participants: 'مشارك سعيد',
        cars: 'سيارة معروضة',
        countries: 'دولة ممثلة'
      },
      time: {
        days: 'يوم',
        hours: 'ساعة',
        minutes: 'دقيقة',
        seconds: 'ثانية'
      },
      instagram: {
        title: 'تابعنا على إنستغرام',
        subtitle: 'شاهد أحدث الصور والفعاليات من حساباتنا الرسمية',
        followUs: 'تابعنا',
        bsmcDesc: 'حساب شركة حلول الاعمال للتسويق ذ.م.م',
        akautoshowDesc: 'الحساب الرسمي لمعرض AK للسيارات',
        bahrainHummerDesc: 'فريق هامر البحرين الرسمي'
      },
      footer: {
        rights: 'جميع الحقوق محفوظة',
        developedBy: 'تطوير',
        companyName: 'شركة حلول الأعمال للتسويق',
        website: 'الموقع',
        instagram: 'إنستغرام',
        whatsapp: 'واتساب'
      }
    },
    en: {
      nav: {
        events: 'Events',
        gallery: 'Gallery',
        about: 'About',
        register: 'Register'
      },
      hero: {
        title: 'DRIFT EVENT',
        patronage: '',
        description: 'Register now to participate in the drift event.',
        registerNow: 'Register Now',
        learnMore: 'Learn More'
      },
      events: {
        title: 'Upcoming Events',
        showcase: 'Car Showcase',
        showcaseDesc: 'Display your vehicle',
        competition: 'Competition',
        competitionDesc: 'Win amazing prizes',
        networking: 'Networking',
        networkingDesc: 'Meet fellow enthusiasts',
        food: 'Food & Drinks',
        foodDesc: 'Enjoy refreshments'
      },
      sponsors: {
        title: 'Our Partners',
        subtitle: 'We are proud to partner with elite companies and organizations',
        diamond: 'Diamond Sponsor',
        gold: 'Gold Sponsor',
        silver: 'Silver Sponsor'
      },
      gallery: {
        title: 'Event Gallery',
        subtitle: 'Memories from our previous events'
      },
      about: {
        title: 'About AKAutoshow',
        description: 'AKAutoshow is the premier platform for automotive enthusiasts in the Middle East. We organize exclusive car shows and meets that bring together the most passionate car lovers and their incredible machines.',
        mission: 'Our Mission',
        missionText: 'To create unforgettable automotive experiences that celebrate car culture and build lasting connections within the community.',
        events: 'Events Organized',
        participants: 'Happy Participants',
        cars: 'Cars Showcased',
        countries: 'Countries Represented'
      },
      time: {
        days: 'Days',
        hours: 'Hours',
        minutes: 'Minutes',
        seconds: 'Seconds'
      },
      instagram: {
        title: 'Follow Us on Instagram',
        subtitle: 'See the latest photos and events from our official accounts',
        followUs: 'Follow Us',
        bsmcDesc: 'Business Solutions Marketing Co. W.L.L',
        akautoshowDesc: 'Official AK Autoshow Account',
        bahrainHummerDesc: 'Official Bahrain Hummer Team'
      },
      footer: {
        rights: 'All rights reserved',
        developedBy: 'Developed by',
        companyName: 'Business Solutions Marketing Co. (BSMC)',
        website: 'Website',
        instagram: 'Instagram',
        whatsapp: 'WhatsApp'
      }
    }
  };

  const t = translations[activeLocale as keyof typeof translations] || translations.en;

  const eventsWithoutDrift = Array.isArray(events)
    ? events.filter((e: any) => {
        const id = String(e?.id || '');
        const name = String(e?.name || e?.name_en || e?.name_ar || '').toLowerCase();
        return id !== '5' && id !== '2' && !name.includes('godzilla');
      })
    : [];

  const rawDriftEvent = Array.isArray(events)
    ? events.find((e: any) => String(e?.id) === '5')
    : null;

  const driftEvent = {
    ...(rawDriftEvent || {}),
    id: rawDriftEvent?.id ?? 5,
    name:
      (activeLocale === 'ar'
        ? rawDriftEvent?.name_ar || rawDriftEvent?.name
        : rawDriftEvent?.name_en || rawDriftEvent?.name) ||
      (activeLocale === 'ar' ? 'فعالية الدرفت' : 'Drift Event'),
    description:
      (activeLocale === 'ar'
        ? rawDriftEvent?.description_ar || rawDriftEvent?.description
        : rawDriftEvent?.description_en || rawDriftEvent?.description) ||
      (activeLocale === 'ar'
        ? 'سجل الآن للمشاركة في فعالية الدرفت.'
        : 'Register now to participate in the drift event.'),
    event_date:
      rawDriftEvent?.event_date ||
      new Date('2026-02-13T14:00:00').toISOString(),
    location:
      rawDriftEvent?.location ||
      (activeLocale === 'ar' ? 'قرية جرافيتي' : 'Gravity Village'),
    status: rawDriftEvent?.status,
    isPremium: true,
  };

  const getEventDisplayData = (event: any) => event;

  // Group sponsors by tier
  const diamondSponsors = sponsors.filter(s => s.tier === 'diamond').sort((a, b) => a.display_order - b.display_order);
  const goldSponsors = sponsors.filter(s => s.tier === 'gold').sort((a, b) => a.display_order - b.display_order);
  const silverSponsors = sponsors.filter(s => s.tier === 'silver').sort((a, b) => a.display_order - b.display_order);

  return (
    <>
      {loading && <Preloader />}
      <div className={`min-h-screen flex flex-col bg-background text-text-primary ${isRTL ? 'rtl' : 'ltr'}`}>
        {/* Header */}
        <header className="bg-black/90 backdrop-blur-sm sticky top-0 z-50 border-b-2 border-purple-900/30 bg-gradient-to-r from-purple-900/20 via-black to-purple-900/20">
        <nav className="container mx-auto px-6 py-4">
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>          {/* Logo */}          <Link href={`/${activeLocale}`} className="flex items-center hover:opacity-80 transition-opacity flex-shrink-0">            <img 
              src="/ak-autoshow-logo-new.png" 
              alt="AK Autoshow" 
              className="h-16 w-auto object-contain"
            />
          </Link>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">              <a 
                href="#events" 
                className="text-gray-300 hover:text-red-400 transition-colors font-medium whitespace-nowrap"
              >
              {t.nav.events}
            </a>              <a 
                href="#gallery" 
                className="text-gray-300 hover:text-red-400 transition-colors font-medium whitespace-nowrap"
              >
              {t.nav.gallery}
            </a>              <a 
                href="#about" 
                className="text-gray-300 hover:text-red-400 transition-colors font-medium whitespace-nowrap"
              >
              {t.nav.about}
            </a>
          </div>
            {/* Language Switcher & CTA */}
            <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <LanguageSwitcher />              <Link 
                href={`/${activeLocale}/register`}
                className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white font-bold py-2.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg whitespace-nowrap"
              >
              {t.nav.register}
            </Link>
          </div>
            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center gap-4 flex-shrink-0">
            <LanguageSwitcher />
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="text-white focus:outline-none p-2 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"}
                />
              </svg>
            </button>            </div>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-md border-t border-gray-800 z-40">
            <div className="container mx-auto px-6 py-6 space-y-4">              <a 
                href="#events" 
                onClick={() => setIsMenuOpen(false)}
                className="block text-gray-300 hover:text-red-400 transition-colors font-medium py-2"
              >
                {t.nav.events}
              </a>
              <a 
                href="#gallery" 
                onClick={() => setIsMenuOpen(false)}
                className="block text-gray-300 hover:text-red-400 transition-colors font-medium py-2"
              >
                {t.nav.gallery}
              </a>
              <a 
                href="#about" 
                onClick={() => setIsMenuOpen(false)}
                className="block text-gray-300 hover:text-red-400 transition-colors font-medium py-2"
              >
                {t.nav.about}
              </a>
              <div className="pt-4">                <Link 
                  href={`/${activeLocale}/register`}
                  onClick={() => setIsMenuOpen(false)}
                  className="block bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-all duration-200"
                >
                  {t.nav.register}
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        {/* Round 3 Postponement Announcement Banner */}
        {!announcementDismissed && (
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="relative z-40 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 border-b-2 border-amber-500/60 shadow-[0_4px_24px_rgba(217,119,6,0.3)]"
          >
            <div className="container mx-auto px-4 py-4 md:py-5">
              <div className={`flex items-start gap-3 ${isRTL ? 'flex-row' : 'flex-row'}`}>
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5 text-amber-400 text-2xl">📢</div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-amber-300 text-base md:text-lg leading-snug mb-2">
                    {isRTL
                      ? 'إعلان هام – الجولة الثالثة من ليالي التفحيط الرمضانية (تقدر 2026)'
                      : 'Important Notice – Round 3: Ramadan Drifting Nights (Taqqadar 2026)'}
                  </p>
                  <p className="text-amber-100/90 text-sm md:text-base leading-relaxed">
                    {isRTL
                      ? 'نظرًا للظروف الحالية، تقرر تأجيل الجولة الثالثة من ليالي التفحيط الرمضانية حتى إشعارٍ آخر. نقدّر تفهمكم وتعاونكم، وسيتم الإعلان عن أي مستجدات عبر القنوات الرسمية للفعالية.'
                      : 'Due to current circumstances, Round 3 of Ramadan Drifting Nights has been postponed until further notice. We appreciate your understanding — updates will be shared through the official event channels.'}
                  </p>
                  <p className="text-amber-400/80 text-xs md:text-sm mt-2 font-medium">
                    {isRTL ? '— اللجنة المنظمة للفعالية' : '— The Event Organizing Committee'}
                  </p>
                </div>

                {/* Dismiss Button */}
                <button
                  onClick={dismissAnnouncement}
                  aria-label="Dismiss announcement"
                  className="flex-shrink-0 text-amber-400/70 hover:text-amber-200 transition-colors p-1 rounded-md hover:bg-amber-500/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center text-center bg-gradient-to-br from-purple-950 via-black to-black">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/10 via-black/50 to-black/80"></div>          <div className="relative z-10 container mx-auto px-6 py-20">
            {/* Hero Video */}
            <div className="flex justify-center mb-8 relative w-full max-w-2xl mx-auto z-10">
              <div className="animate-fade-in-up rounded-3xl overflow-hidden border border-white/10 bg-white/95 p-2 md:p-3">
                {heroLogoOk ? (
                  <video
                    ref={heroVideoRef}
                    src={heroVideoSrc}
                    className="max-h-40 md:max-h-56 lg:max-h-64 w-auto object-contain"
                    autoPlay
                    loop
                    playsInline
                    preload="auto"
                    muted
                    poster="/placeholder-hero.jpg"
                    onError={() => setHeroLogoOk(false)}
                  />
                ) : (
                  <img
                    src="/placeholder-hero.jpg"
                    alt="Hero"
                    className="max-h-40 md:max-h-56 lg:max-h-64 w-auto object-contain"
                  />
                )}
              </div>
            </div>
            <h1 id="hero-title" className="text-4xl md:text-6xl lg:text-7xl font-heading font-extrabold text-text-primary leading-tight mb-6">
              {t.hero.title}
            </h1>

            <div className="flex flex-col items-center gap-2 mb-6">
              <div className="text-gray-300 text-sm md:text-base">
                🔥 <span className="font-semibold">Powered by driftandfreestyle</span>
              </div>
              <div className="text-gray-400 text-xs md:text-sm">
                {t.footer.developedBy}{' '}
                <a
                  href="https://www.bsmc.bh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-200 hover:text-white underline underline-offset-4"
                >
                  {t.footer.companyName}
                </a>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-6 mb-10 max-w-4xl mx-auto animate-fade-in-up md:mt-8">
              {!!t.hero.patronage && (
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-wide leading-relaxed text-[#deb887] drop-shadow-md border-b-2 border-[#deb887]/30 pb-4 px-8 inline-block">
                  {t.hero.patronage}
                </h2>
              )}
              <p className="text-lg md:text-xl lg:text-2xl text-gray-200 leading-relaxed font-light">
                {t.hero.description}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {driftEvent?.status === 'paused' ? (
                <button
                  disabled
                  className="bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-lg w-full sm:w-auto cursor-not-allowed opacity-80"
                >
                  {activeLocale === 'ar' ? 'التسجيل مغلق مؤقتاً' : 'Registration Paused'}
                </button>
              ) : (
              <Link 
                href={`/${activeLocale}/e/${primaryEventId}`}
                className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-800 hover:opacity-90 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl w-full sm:w-auto"
              >
                {t.hero.registerNow}
              </Link>
              )}
              <Link 
                href={`/${activeLocale}/become-sponsor`} 
                className="border-2 border-transparent bg-gradient-to-r from-purple-600 via-violet-600 to-purple-800 p-[2px] rounded-lg transition-all duration-300 hover:shadow-xl w-full sm:w-auto"
              >
                <div className="bg-black rounded-lg px-8 py-4 h-full flex items-center justify-center text-white font-bold text-lg hover:bg-gray-900 transition-colors">
                  {activeLocale === 'ar' ? 'كن راعياً' : 'Become a Sponsor'}
                </div>
              </Link>
            </div>
          </div>
        </section>
            {/* Sponsors Section - Replacing Products */}
        <ScrollReveal>
          <section id="sponsors" className="py-20 bg-gradient-to-br from-black via-purple-950/20 to-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
            
            <div className="container mx-auto px-6 relative z-10">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-4 text-center text-text-primary drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                {t.sponsors.title}
              </h2>
              <p className="text-lg md:text-xl text-gray-300 mb-16 text-center max-w-3xl mx-auto">
                {t.sponsors.subtitle}
              </p>

              <div className="max-w-7xl mx-auto space-y-16">
                
                {/* Diamond Tier */}
                {diamondSponsors.length > 0 && (
                  <div className="relative">
                     <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-400"></div>
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-cyan-300 uppercase tracking-widest text-center shadow-cyan-500/50 drop-shadow-lg">
                          {t.sponsors.diamond}
                        </h3>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-400"></div>
                     </div>
                     <div className="flex flex-wrap justify-center gap-8 md:gap-12">
                        {diamondSponsors.map(sponsor => (
                          <a 
                            key={sponsor.id} 
                            href={sponsor.website_url || '#'} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative w-full sm:w-80 md:w-96 aspect-[3/2] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md rounded-2xl border border-cyan-500/30 hover:border-cyan-400/80 transition-all duration-500 hover:shadow-[0_0_50px_rgba(6,182,212,0.3)] hover:-translate-y-2"
                          >
                             {/* Glow Effect */}
                             <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                             
                             <img 
                               src={sponsor.logo_url} 
                               alt={sponsor.name}
                               className="w-full h-full object-contain filter drop-shadow-lg group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500 transform group-hover:scale-110"
                               onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&size=300&background=000&color=fff`; 
                               }}
                             />
                             <div className="absolute bottom-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <span className="text-cyan-300 text-sm font-medium tracking-wider">{sponsor.name}</span>
                             </div>
                          </a>
                        ))}
                     </div>
                  </div>
                )}

                {/* Gold Tier */}
                {goldSponsors.length > 0 && (
                  <div className="relative">
                     <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400"></div>
                        <h3 className="text-xl font-bold text-amber-400 uppercase tracking-widest text-center">
                          {t.sponsors.gold}
                        </h3>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400"></div>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8">
                        {goldSponsors.map(sponsor => (
                          <a 
                            key={sponsor.id} 
                            href={sponsor.website_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group relative aspect-video flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm rounded-xl border border-amber-500/20 hover:border-amber-400/60 transition-all duration-300 hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:-translate-y-1"
                          >
                             <img 
                               src={sponsor.logo_url} 
                               alt={sponsor.name}
                               className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-105"
                               onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&size=200&background=000&color=fff`;
                               }}
                             />
                          </a>
                        ))}
                     </div>
                  </div>
                )}

                {/* Silver Tier */}
                {silverSponsors.length > 0 && (
                  <div className="relative">
                     <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="h-px w-12 bg-gradient-to-r from-transparent to-gray-400"></div>
                        <h3 className="text-lg font-bold text-gray-400 uppercase tracking-widest text-center">
                          {t.sponsors.silver}
                        </h3>
                        <div className="h-px w-12 bg-gradient-to-l from-transparent to-gray-400"></div>
                     </div>
                     <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                        {silverSponsors.map(sponsor => (
                          <a 
                            key={sponsor.id} 
                            href={sponsor.website_url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group relative aspect-[3/2] flex items-center justify-center p-3 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:border-white/30 transition-all duration-300 hover:-translate-y-1"
                          >
                             <img 
                               src={sponsor.logo_url} 
                               alt={sponsor.name}
                               className="w-full h-full object-contain opacity-70 group-hover:opacity-100 transition-all duration-300"
                               onError={(e) => {
                                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(sponsor.name)}&size=150&background=000&color=fff`;
                               }}
                             />
                          </a>
                        ))}
                     </div>
                  </div>
                )}

                {sponsors.length === 0 && (
                    <div className="text-center py-12">
                       <p className="text-gray-500">{activeLocale === 'ar' ? 'جاري تحميل الرعاة...' : 'Loading sponsors...'}</p>
                    </div>
                )}

              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Events Section */}
        <ScrollReveal>
          <section id="events" className="py-20 bg-background-secondary">
          <div className="container mx-auto px-6">            <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-16 text-center text-text-primary">
              {t.events.title}
            </h2>
            
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Drift Event (Always show on homepage) */}
              <div className="relative overflow-hidden p-1 rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-[#deb887] via-[#fbfbfb] to-[#deb887] rounded-2xl opacity-50"></div>
                <div className="absolute inset-[2px] bg-black rounded-2xl z-0"></div>

                <div className="relative z-10 p-8 md:p-12 text-center">
                  <div className="inline-block mb-6">
                    <span className="bg-gradient-to-r from-[#deb887] to-yellow-600 text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">
                      {activeLocale === 'ar' ? 'فعالية الدرفت' : 'DRIFT EVENT'}
                    </span>
                  </div>

                  <h3 className="text-3xl md:text-5xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#deb887] via-white to-[#deb887] mb-8 drop-shadow-lg">
                    {driftEvent.name}
                  </h3>

                  <CountdownTimer targetDate={new Date(driftEvent.event_date)} labels={t.time} />

                  <div className="grid md:grid-cols-3 gap-6 my-10 max-w-4xl mx-auto border-t border-b border-[#deb887]/20 py-8">
                    <div className="flex flex-col items-center">
                      <span className="text-[#deb887] mb-2 text-sm uppercase tracking-wider">{activeLocale === 'ar' ? 'التاريخ' : 'DATE'}</span>
                      <span className="text-white text-xl font-bold">
                        {new Date(driftEvent.event_date).toLocaleDateString(activeLocale === 'ar' ? 'ar-BH' : 'en-US', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex flex-col items-center border-l-0 border-r-0 md:border-l md:border-r border-[#deb887]/20 py-4 md:py-0">
                      <span className="text-[#deb887] mb-2 text-sm uppercase tracking-wider">{activeLocale === 'ar' ? 'الوقت' : 'TIME'}</span>
                      <span className="text-white text-xl font-bold">
                        {new Date(driftEvent.event_date).toLocaleTimeString(activeLocale === 'ar' ? 'ar-BH' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[#deb887] mb-2 text-sm uppercase tracking-wider">{activeLocale === 'ar' ? 'المكان' : 'LOCATION'}</span>
                      <span className="text-white text-xl font-bold">
                        {driftEvent.location || (activeLocale === 'ar' ? 'سيتم تحديده' : 'TBD')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-center">
                    {driftEvent.status === 'paused' ? (
                       <button
                         disabled
                         className="bg-gray-600 text-white font-bold py-4 px-10 rounded-lg text-lg cursor-not-allowed opacity-75"
                       >
                         {activeLocale === 'ar' ? 'التسجيل مغلق مؤقتاً (فرز الطلبات)' : 'Registration Paused (Reviewing)'}
                       </button>
                    ) : (
                    <Link
                      href={`/${activeLocale}/e/${String(driftEvent.id)}`}
                      className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-800 hover:opacity-90 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
                    >
                      {activeLocale === 'ar' ? 'التسجيل' : 'Register'}
                    </Link>
                    )}
                  </div>
                </div>
              </div>

              {eventsWithoutDrift.length > 0 ? (                eventsWithoutDrift.map((rawEvent) => {
                  const event = getEventDisplayData(rawEvent);

                  if (event?.isPremium) {
                    return (
                      <div key={event.id} className="relative overflow-hidden p-1 rounded-2xl">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#deb887] via-[#fbfbfb] to-[#deb887] rounded-2xl opacity-50"></div>
                        <div className="absolute inset-[2px] bg-black rounded-2xl z-0"></div>

                        <div className="relative z-10 p-8 md:p-12 text-center">
                          <div className="inline-block mb-6">
                            <span className="bg-gradient-to-r from-[#deb887] to-yellow-600 text-black text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest">
                              {activeLocale === 'ar' ? 'الحدث الرئيسي' : 'MAIN EVENT'}
                            </span>
                          </div>

                          <h3 className="text-3xl md:text-5xl font-heading font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#deb887] via-white to-[#deb887] mb-8 drop-shadow-lg">
                            {event.name}
                          </h3>

                          <CountdownTimer targetDate={new Date(event.event_date)} labels={t.time} />

                          <div className="grid md:grid-cols-3 gap-6 my-10 max-w-4xl mx-auto border-t border-b border-[#deb887]/20 py-8">
                            <div className="flex flex-col items-center">
                              <span className="text-[#deb887] mb-2 text-sm uppercase tracking-wider">{activeLocale === 'ar' ? 'التاريخ' : 'DATE'}</span>
                              <span className="text-white text-xl font-bold">
                                {new Date(event.event_date).toLocaleDateString(activeLocale === 'ar' ? 'ar-BH' : 'en-US', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="flex flex-col items-center border-l-0 border-r-0 md:border-l md:border-r border-[#deb887]/20 py-4 md:py-0">
                              <span className="text-[#deb887] mb-2 text-sm uppercase tracking-wider">{activeLocale === 'ar' ? 'الوقت' : 'TIME'}</span>
                              <span className="text-white text-xl font-bold">
                                {new Date(event.event_date).toLocaleTimeString(activeLocale === 'ar' ? 'ar-BH' : 'en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[#deb887] mb-2 text-sm uppercase tracking-wider">{activeLocale === 'ar' ? 'المكان' : 'LOCATION'}</span>
                              <span className="text-white text-xl font-bold">
                                {event.location || (activeLocale === 'ar' ? 'سيتم تحديده' : 'TBD')}
                              </span>
                            </div>
                          </div>

                          <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto mb-8 font-light">{event.description}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                  <div key={event.id} className="bg-gradient-to-br from-gray-700 to-gray-800 p-8 md:p-12 rounded-2xl shadow-2xl border border-gray-600">                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-brand mb-6 text-center">
                      {event.name}
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                      <div className="text-center md:text-left">                        <span className="text-text-secondary block mb-2 text-sm uppercase tracking-wider">
                          {activeLocale === 'ar' ? 'التاريخ' : 'Date'}
                        </span>
                        <span className="text-text-primary font-bold text-lg">
                          {event.event_date ? new Date(event.event_date).toLocaleDateString(activeLocale === 'ar' ? 'ar-BH' : 'en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'TBD'}
                        </span>
                      </div>
                      {event.event_date && (
                        <div className="text-center md:text-left">                          <span className="text-text-secondary block mb-2 text-sm uppercase tracking-wider">
                            {activeLocale === 'ar' ? 'الوقت' : 'Time'}
                          </span>
                          <span className="text-text-primary font-bold text-lg">
                            {new Date(event.event_date).toLocaleTimeString(activeLocale === 'ar' ? 'ar-BH' : 'en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                      <div className="text-center md:text-left">                        <span className="text-text-secondary block mb-2 text-sm uppercase tracking-wider">
                          {activeLocale === 'ar' ? 'المكان' : 'Location'}
                        </span>
                        <span className="text-text-primary font-bold text-lg">
                          {event.location || (activeLocale === 'ar' ? 'سيتم تحديده لاحقاً' : 'To be announced')}
                        </span>
                      </div>
                    </div>
                    {event.description && (
                      <p className="text-gray-300 text-lg leading-relaxed text-center md:text-left">
                        {event.description}
                      </p>
                    )}
                    {event.status && (
                      <div className="mt-4 text-center">
                        <span className={`inline-block px-4 py-2 rounded-full text-sm font-medium ${
                          event.status === 'upcoming' 
                            ? 'bg-blue-600 text-white' 
                            : event.status === 'active' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-gray-600 text-white'
                        }`}>
                          {activeLocale === 'ar' 
                            ? (event.status === 'upcoming' ? 'قادم' : event.status === 'active' ? 'نشط' : 'منتهي')
                            : (event.status === 'upcoming' ? 'Upcoming' : event.status === 'active' ? 'Active' : 'Past')
                          }
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-6">📅</div>                  <p className="text-text-secondary text-xl mb-4">
                    {activeLocale === 'ar' 
                      ? 'لا توجد فعاليات قادمة في الوقت الحالي'
                      : 'No upcoming events at the moment'
                    }
                  </p>
                  <p className="text-text-secondary opacity-75">
                    {activeLocale === 'ar' 
                      ? 'يرجى المراجعة لاحقاً'
                      : 'Please check back later'
                    }
                  </p>
                </div>
              )}
            </div>
                {/* Event Features */}            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">              <div className="group text-center bg-gradient-to-br from-red-500 to-pink-600 p-6 rounded-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-red-500/30 border border-red-400/30">
                <div className="bg-white/10 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 border border-white/20">
                  <span className="text-3xl">🚗</span>                </div><h4 className="font-heading font-bold text-white mb-3 text-lg">
                  {t.events.showcase}
                </h4>                <p className="text-white/90 text-sm">
                  {t.events.showcaseDesc}
                </p>
              </div>              <div className="group text-center bg-gradient-to-br from-yellow-500 to-orange-600 p-6 rounded-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-yellow-500/30 border border-yellow-400/30">
                <div className="bg-white/10 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 border border-white/20">
                  <span className="text-3xl">🏆</span>                </div><h4 className="font-heading font-bold text-white mb-3 text-lg">
                  {t.events.competition}
                </h4>                <p className="text-white/90 text-sm">
                  {t.events.competitionDesc}
                </p>
              </div>              <div className="group text-center bg-gradient-to-br from-purple-500 to-indigo-600 p-6 rounded-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/30 border border-purple-400/30">
                <div className="bg-white/10 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 border border-white/20">
                  <span className="text-3xl">🤝</span>                </div><h4 className="font-heading font-bold text-white mb-3 text-lg">
                  {t.events.networking}
                </h4>                <p className="text-white/90 text-sm">
                  {t.events.networkingDesc}
                </p>
              </div>              <div className="group text-center bg-gradient-to-br from-green-500 to-teal-600 p-6 rounded-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/30 border border-green-400/30">
                <div className="bg-white/10 backdrop-blur-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 border border-white/20">
                  <span className="text-3xl">🍔</span>                </div><h4 className="font-heading font-bold text-white mb-3 text-lg">
                  {t.events.food}
                </h4>                <p className="text-white/90 text-sm">
                  {t.events.foodDesc}
                </p>
              </div></div>
          </div>
        </section>
        </ScrollReveal>

        {/* Sponsors Section removed - already inline */}

        {/* Gallery Section */}
        <ScrollReveal delay={0.2}>
          <section id="gallery" className="py-20 bg-background">
            <div className="container mx-auto px-6 text-center">
              <ScrollReveal>
                <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-text-primary">
                  {t.gallery.title}
                </h2>
                <p className="text-text-secondary text-lg lg:text-xl mb-16 max-w-2xl mx-auto">
                  {t.gallery.subtitle}
                </p>
              </ScrollReveal>              <ScrollReveal delay={0.2}>
                <InteractiveGallery />
              </ScrollReveal>
            </div>
          </section>
        </ScrollReveal>        {/* About Section */}
        <ScrollReveal delay={0.4}>
          <section id="about" className="py-20 bg-background-secondary">
            <div className="container mx-auto px-6">
              <div className="max-w-6xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold mb-8 text-text-primary">
                  {t.about.title}
                </h2>
                <p className="text-gray-300 text-lg lg:text-xl mb-16 max-w-4xl mx-auto leading-relaxed">
                  {t.about.description}
                </p>
                <div className="bg-gradient-to-br from-gray-700 to-gray-800 p-8 md:p-12 rounded-2xl mb-16 shadow-2xl">
                  <h3 className="text-2xl md:text-3xl font-heading font-bold mb-6 text-brand">
                    {t.about.mission}
                  </h3>
                  <p className="text-gray-300 text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto">
                    {t.about.missionText}
                  </p>
                </div>
                {/* Stats */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="text-center bg-gray-700/50 p-6 rounded-xl hover:bg-gray-700 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold text-brand mb-3">50+</div>
                    <div className="text-text-secondary font-medium">
                      {t.about.events}
                    </div>
                  </div>
                  <div className="text-center bg-gray-700/50 p-6 rounded-xl hover:bg-gray-700 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold text-brand mb-3">5000+</div>
                    <div className="text-text-secondary font-medium">
                      {t.about.participants}
                    </div>
                  </div>
                  <div className="text-center bg-gray-700/50 p-6 rounded-xl hover:bg-gray-700 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold text-brand mb-3">2500+</div>
                    <div className="text-text-secondary font-medium">
                      {t.about.cars}
                    </div>
                  </div>
                  <div className="text-center bg-gray-700/50 p-6 rounded-xl hover:bg-gray-700 transition-all duration-300">
                    <div className="text-4xl md:text-5xl font-bold text-brand mb-3">15+</div>
                    <div className="text-text-secondary font-medium">
                      {t.about.countries}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Instagram Section */}
        <ScrollReveal delay={0.2}>
          <section className="py-20 bg-gradient-to-br from-gray-900 to-black border-t border-gray-800">
            <div className="container mx-auto px-6 text-center">
              <ScrollReveal>
                <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-text-primary">
                  {t.instagram.title}
                </h2>
                <p className="text-text-secondary text-lg lg:text-xl mb-16 max-w-2xl mx-auto">
                  {t.instagram.subtitle}
                </p>
              </ScrollReveal>
              
              <ScrollReveal delay={0.3}>
                <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                  {/* Account 1 */}
                  <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-8 rounded-2xl border border-purple-500/30 hover:border-purple-500/60 transition-all duration-300 hover:scale-105 group">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>                      <h3 className="text-xl font-bold text-white mb-2">@bsmc.mena</h3>
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">{t.instagram.bsmcDesc}</p>
                      <a 
                        href="https://instagram.com/bsmc.mena" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:shadow-lg hover:scale-105"
                      >
                        {t.instagram.followUs}
                      </a>
                    </div>
                  </div>

                  {/* Account 2 */}
                  <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-8 rounded-2xl border border-blue-500/30 hover:border-blue-500/60 transition-all duration-300 hover:scale-105 group">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>                      <h3 className="text-xl font-bold text-white mb-2">@akautoshow</h3>
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">{t.instagram.akautoshowDesc}</p>
                      <a 
                        href="https://instagram.com/akautoshow" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-full font-semibold hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 hover:shadow-lg hover:scale-105"
                      >
                        {t.instagram.followUs}
                      </a>
                    </div>
                  </div>

                  {/* Account 3 */}
                  <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 p-8 rounded-2xl border border-orange-500/30 hover:border-orange-500/60 transition-all duration-300 hover:scale-105 group">
                    <div className="flex flex-col items-center">
                      <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </div>                      <h3 className="text-xl font-bold text-white mb-2">@BAHRAIN_hummer_team</h3>
                      <p className="text-gray-300 text-sm mb-4 leading-relaxed">{t.instagram.bahrainHummerDesc}</p>
                      <a 
                        href="https://instagram.com/BAHRAIN_hummer_team" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-full font-semibold hover:from-orange-600 hover:to-red-600 transition-all duration-300 hover:shadow-lg hover:scale-105"
                      >
                        {t.instagram.followUs}
                      </a>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </section>
        </ScrollReveal>
      </main>

      {/* Footer */}<footer className="bg-black border-t-2 border-transparent bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 py-12">
        <div className="container mx-auto px-6 text-center">          <div className="mb-6">            <img 
              src="/ak-autoshow-logo-new.png" 
              alt="AK Autoshow" 
              className="h-20 w-auto mx-auto object-contain"
            />
          </div><p className="text-text-secondary">
            © {new Date().getFullYear()} BSMC.BH. {t.footer.rights}.
          </p>

          <div className="mt-6 max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col items-center justify-center text-center gap-3">
              <a
                href="https://www.bsmc.bh"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-90 transition"
              >
                <img
                  src="/BSMC.BH1.jpg"
                  alt="BSMC"
                  className="h-12 md:h-14 w-auto object-contain rounded"
                />
              </a>

              <div className="text-gray-200 font-semibold">
                {t.footer.developedBy}: {t.footer.companyName}
              </div>

              <div className="flex items-center justify-center gap-6 flex-wrap text-sm">
                <a
                  href="https://instagram.com/bsmc.mena"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white underline underline-offset-4"
                >
                  {t.footer.instagram}
                </a>
                <a
                  href="https://www.bsmc.bh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white underline underline-offset-4"
                >
                  {t.footer.website}
                </a>
                <a
                  href="https://wa.me/97338409977"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-300 hover:text-white underline underline-offset-4"
                >
                  {t.footer.whatsapp}
                </a>
              </div>
            </div>
          </div>
        </div>      </footer>

      {/* Live Chat Widget */}
      <ChatwayWidget />
      </div>
    </>
  );
}
