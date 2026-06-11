export const siteConfig = {
  name: "Tomhel Preparatory School",
  shortName: "Tomhel",
  slogan: "Press On to Higher Grounds",
  description:
    "Quality education nurturing academic excellence, character development, leadership, creativity, and lifelong learning in Ghana.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://tomhel.edu.gh",
  phone: "024 424 2394",
  phoneHref: "+233244242394",
  email: "tomhelschool@yahoo.com",
  admissionsEmail: "tomhelschool@yahoo.com",
  address: "Effiduasi, Ashanti Region, Ghana",
  addressLocality: "Effiduasi",
  addressRegion: "Ashanti",
  officeHours: "Monday – Friday: 7:30 AM – 4:30 PM",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100077019686158",
    instagram: "https://instagram.com/tomhel",
    linkedin: "https://linkedin.com/company/tomhel",
  },
  portalUrl: "https://taim.tomhel.edu.gh",
  taim: {
    primary: "#7BC96F",
    light: "#E8F5E9",
    dark: "#3D8B40",
  },
};

/** Local school photos — files live in public/IMGG/ */
export const schoolImages = {
  logo: "/IMGG/logo.jpg",
  hero: "/IMGG/hero-background.jpg",
  kindergarten: "/IMGG/kindergarten.jpg",
} as const;

export const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "Student Life", href: "/student-life" },
  { label: "Gallery", href: "/gallery" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
];

export const pillars = [
  {
    title: "Academic Excellence",
    description:
      "Rigorous curriculum and dedicated educators ensure every student reaches their full academic potential.",
    icon: "GraduationCap",
  },
  {
    title: "Character Development",
    description:
      "We instill integrity, discipline, and moral values that shape responsible citizens and future leaders.",
    icon: "Heart",
  },
  {
    title: "Modern Learning",
    description:
      "Technology-integrated classrooms and the TAIM platform prepare students for a digital future.",
    icon: "Laptop",
  },
  {
    title: "Caring Community",
    description:
      "A supportive environment where every child is known, valued, and encouraged to thrive.",
    icon: "Users",
  },
];

export const stats = [
  { label: "Students", value: 850, suffix: "+" },
  { label: "Teachers", value: 45, suffix: "+" },
  { label: "Success Rate", value: 98, suffix: "%" },
  { label: "Years of Excellence", value: 15, suffix: "+" },
];

export const programs = [
  {
    title: "Kindergarten",
    description:
      "Play-based learning that builds foundational literacy, numeracy, and social skills in a nurturing environment.",
    image: schoolImages.kindergarten,
    href: "/academics#kindergarten",
  },
  {
    title: "Primary",
    description:
      "Comprehensive primary education aligned with Ghana Education Service standards, fostering curiosity and critical thinking.",
    image: schoolImages.hero,
    href: "/academics#primary",
  },
  {
    title: "Junior High School",
    description:
      "BECE-focused preparation with strong subject mastery, leadership training, and career guidance.",
    image: schoolImages.hero,
    href: "/academics#jhs",
  },
];

export const taimFeatures = [
  { title: "Student Portal", description: "Access assignments, timetables, and learning resources anytime." },
  { title: "Parent Portal", description: "Monitor progress, attendance, and communicate with teachers." },
  { title: "Attendance Tracking", description: "Real-time attendance records and automated notifications." },
  { title: "Results Management", description: "Secure access to report cards and academic performance data." },
  { title: "BECE Practice", description: "Interactive past questions and mock exams for JHS students." },
];

export const facilities = [
  { title: "Classrooms", image: schoolImages.hero },
  { title: "ICT Lab", image: schoolImages.kindergarten },
  { title: "Library", image: schoolImages.hero },
  { title: "Playground", image: schoolImages.kindergarten },
];

export const testimonials = [
  {
    quote:
      "Tomhel has transformed our daughter's confidence and academic performance. The teachers genuinely care about every child.",
    author: "Mrs. Adwoa Mensah",
    role: "Parent",
  },
  {
    quote:
      "The TAIM platform makes it easy to track my grades and prepare for BECE. I feel ready for the next chapter.",
    author: "Kwame Asante",
    role: "JHS Student",
  },
  {
    quote:
      "The foundation I received at Tomhel shaped my career. Discipline, excellence, and community — values that last a lifetime.",
    author: "Dr. Efua Boateng",
    role: "Alumni, Class of 2015",
  },
];

export const coreValues = [
  { title: "Excellence", description: "We pursue the highest standards in all we do." },
  { title: "Integrity", description: "Honesty and ethical conduct guide our community." },
  { title: "Innovation", description: "We embrace modern tools and creative approaches to learning." },
  { title: "Respect", description: "Every individual is treated with dignity and care." },
  { title: "Leadership", description: "We develop confident leaders who serve others." },
  { title: "Community", description: "Together we build a supportive, inclusive school family." },
];

export const leadership = [
  { name: "Rev. Dr. Thomas Helms", role: "Founder & Director", image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80" },
  { name: "Mrs. Helena Adom", role: "Head of School", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80" },
  { name: "Mr. Kofi Annan", role: "Academic Coordinator", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80" },
  { name: "Mrs. Ama Serwaa", role: "Student Affairs", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80" },
];

export const historyTimeline = [
  { year: "2010", title: "Foundation", description: "Tomhel Preparatory School was established with a vision for excellence." },
  { year: "2013", title: "Primary Expansion", description: "Added full primary program serving grades 1–6." },
  { year: "2016", title: "JHS Launch", description: "Junior High School program launched with first BECE cohort." },
  { year: "2019", title: "TAIM Platform", description: "Digital academic management system introduced school-wide." },
  { year: "2022", title: "Modern Campus", description: "New ICT lab, library, and upgraded facilities completed." },
  { year: "2025", title: "Regional Recognition", description: "Recognized among leading preparatory schools in the Ashanti Region." },
];

export const admissionSteps = [
  { step: 1, title: "Inquiry", description: "Contact admissions or visit our campus for an introductory tour." },
  { step: 2, title: "Application", description: "Complete the online application form with required documents." },
  { step: 3, title: "Assessment", description: "Student participates in age-appropriate entrance assessment." },
  { step: 4, title: "Interview", description: "Brief meeting with parents and school administration." },
  { step: 5, title: "Enrollment", description: "Receive admission letter, pay fees, and begin orientation." },
];

export const admissionFaqs = [
  {
    question: "What age can my child start Kindergarten?",
    answer: "Children must be at least 4 years old by September 1st of the admission year for Kindergarten 1.",
  },
  {
    question: "What documents are required for application?",
    answer: "Birth certificate, previous school report (if applicable), passport photos, and immunization records.",
  },
  {
    question: "Is there a waiting list?",
    answer: "Popular grade levels may have limited spaces. We maintain a waiting list and notify families when spots open.",
  },
  {
    question: "Do you offer financial aid?",
    answer: "Limited scholarship opportunities are available based on merit and need. Contact admissions for details.",
  },
  {
    question: "Can I schedule a campus tour?",
    answer: "Yes. Tours are available Monday through Friday. Book via our contact form or call the admissions office.",
  },
];

export const studentLifeCategories = [
  {
    title: "Sports",
    description: "Football, athletics, volleyball, and inter-school competitions build teamwork and fitness.",
    image: schoolImages.hero,
  },
  {
    title: "Clubs",
    description: "Debate, robotics, art, music, and environmental clubs nurture diverse talents.",
    image: schoolImages.kindergarten,
  },
  {
    title: "Competitions",
    description: "Students excel in science fairs, spelling bees, and national academic contests.",
    image: schoolImages.hero,
  },
  {
    title: "Excursions",
    description: "Educational trips to museums, historical sites, and science centers broaden horizons.",
    image: schoolImages.kindergarten,
  },
  {
    title: "Cultural Activities",
    description: "Traditional dance, drama, and heritage celebrations honor Ghanaian culture.",
    image: schoolImages.hero,
  },
];

export const galleryCategories = [
  { id: "campus", label: "Campus", images: [schoolImages.hero, schoolImages.hero, schoolImages.kindergarten] },
  { id: "academics", label: "Academics", images: [schoolImages.kindergarten, schoolImages.kindergarten, schoolImages.hero] },
  { id: "events", label: "Events", images: [schoolImages.hero, schoolImages.kindergarten, schoolImages.hero] },
  { id: "sports", label: "Sports", images: [schoolImages.hero, schoolImages.hero, schoolImages.kindergarten] },
  { id: "graduation", label: "Graduation", images: [schoolImages.kindergarten, schoolImages.hero, schoolImages.kindergarten] },
];

export const academicsData = [
  {
    id: "kindergarten",
    title: "Kindergarten",
    curriculum: "Play-based Ghana Early Childhood Education framework with phonics, numeracy, and social-emotional learning.",
    subjects: ["Literacy & Phonics", "Numeracy", "Creative Arts", "Physical Development", "Social Studies"],
    methodology: "Hands-on activities, storytelling, sensory play, and small-group instruction.",
    assessments: "Continuous observation, portfolio assessments, and parent-teacher conferences.",
  },
  {
    id: "primary",
    title: "Primary (Grades 1–6)",
    curriculum: "GES-aligned curriculum with enhanced STEM integration and reading comprehension focus.",
    subjects: ["English", "Mathematics", "Science", "Social Studies", "ICT", "Ghanaian Language", "RME", "Creative Arts"],
    methodology: "Differentiated instruction, project-based learning, and collaborative group work.",
    assessments: "Continuous assessment, term examinations, and standardized progress tracking via TAIM.",
  },
  {
    id: "jhs",
    title: "Junior High School (Grades 7–9)",
    curriculum: "Comprehensive GES JHS curriculum with intensive BECE preparation and leadership development.",
    subjects: ["English", "Mathematics", "Integrated Science", "Social Studies", "ICT", "French", "BDT", "RME"],
    methodology: "Exam-focused coaching, mock tests, peer tutoring, and research projects.",
    assessments: "Weekly tests, term exams, BECE mock examinations, and TAIM analytics dashboard.",
  },
];

export const portalRoles = [
  { title: "Students", description: "Access assignments, results, and BECE practice.", icon: "GraduationCap" },
  { title: "Parents", description: "Monitor attendance, fees, and academic progress.", icon: "Users" },
  { title: "Teachers", description: "Manage classes, grades, and lesson plans.", icon: "BookOpen" },
  { title: "Administrators", description: "School-wide analytics and system management.", icon: "Shield" },
];

export const portalFeatures = [
  { title: "Results", description: "View report cards and performance trends." },
  { title: "Attendance", description: "Track daily attendance records." },
  { title: "BECE Practice", description: "Interactive past questions and mocks." },
  { title: "Academic Calendar", description: "Term dates, holidays, and events." },
];

export const fallbackNews = [
  {
    _id: "1",
    title: "Tomhel Students Excel at Regional Science Fair",
    excerpt: "Our JHS team secured first place at the Ashanti Regional Science and Maths Quiz.",
    category: "Achievements",
    publishedAt: "2025-05-15",
    slug: "science-fair-2025",
    image: schoolImages.kindergarten,
  },
  {
    _id: "2",
    title: "2025/2026 Admissions Now Open",
    excerpt: "Limited spaces available across all grade levels. Apply early to secure your child's place.",
    category: "Announcements",
    publishedAt: "2025-04-01",
    slug: "admissions-2025-2026",
    image: schoolImages.kindergarten,
  },
  {
    _id: "3",
    title: "Annual Cultural Day Celebration",
    excerpt: "Students showcased Ghanaian heritage through dance, drama, and traditional attire.",
    category: "Events",
    publishedAt: "2025-03-20",
    slug: "cultural-day-2025",
    image: schoolImages.hero,
  },
];
