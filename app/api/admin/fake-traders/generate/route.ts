import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase'

const NAMES: Record<string, string[]> = {
  KE: ['James Kamau', 'Grace Wanjiru', 'Brian Otieno', 'Faith Achieng', 'Kevin Mutua', 'Mercy Njeri', 'Dennis Omondi', 'Esther Wambui', 'Collins Kipchoge', 'Lydia Auma', 'Victor Mwangi', 'Irene Chebet', 'Samuel Maina', 'Carol Nduta', 'Edwin Ochieng', 'Beatrice Moraa', 'Patrick Kimani', 'Tabitha Wanjiku', 'Duncan Okeyo', 'Agnes Muthoni'],
  UG: ['Ronald Ssebulime', 'Prossy Nakato', 'Ivan Mugisha', 'Annet Namutebi', 'Joseph Ssali', 'Ritah Nampijja', 'Emmanuel Byaruhanga', 'Judith Nanteza', 'Alex Tumwebaze', 'Ruth Akullo'],
  TZ: ['Juma Makame', 'Zawadi Mwamba', 'Hassan Msigwa', 'Fatuma Ally', 'Rashidi Mwangi', 'Amina Salehe', 'Baraka Kimaro', 'Zuhura Hamisi', 'Idris Mushi', 'Neema Tarimo'],
  NG: ['Chukwuemeka Obi', 'Ngozi Adeyemi', 'Tunde Bakare', 'Amaka Eze', 'Biodun Afolabi', 'Chidinma Nwosu', 'Emeka Okafor', 'Nneka Obiora', 'Femi Adeleke', 'Blessing Nwachukwu'],
  GH: ['Kwame Asante', 'Abena Mensah', 'Kofi Boateng', 'Ama Ofori', 'Kweku Darko', 'Akua Frimpong', 'Yaw Owusu', 'Efua Appiah', 'Nana Agyei', 'Adwoa Amponsah'],
  ZA: ['Sipho Dlamini', 'Nomsa Khumalo', 'Thabo Nkosi', 'Zanele Mokoena', 'Bongani Zulu', 'Lindiwe Ntuli', 'Sibusiso Mthembu', 'Nompumelelo Shabalala', 'Mthokozisi Hadebe', 'Nokwanda Mkhize'],
  PH: ['Juan Santos', 'Maria Reyes', 'Jose Cruz', 'Ana Dela Cruz', 'Mark Flores', 'Joy Bautista', 'Ryan Garcia', 'Liza Fernandez', 'Carlo Ramos', 'Cristina Villanueva'],
  IN: ['Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sunita Singh', 'Vijay Gupta', 'Pooja Yadav', 'Rajesh Verma', 'Deepa Nair', 'Suresh Reddy', 'Kavitha Iyer'],
  BD: ['Rahim Chowdhury', 'Nasrin Begum', 'Karim Ahmed', 'Sultana Islam', 'Faruk Hassan', 'Rima Khatun', 'Jalal Uddin', 'Shimu Akter', 'Ratan Miah', 'Lovely Begum'],
  ET: ['Kebede Tadesse', 'Tigist Haile', 'Abebe Girma', 'Marta Tesfaye', 'Dawit Bekele', 'Selam Alemu', 'Yonas Negash', 'Hiwot Berhane', 'Solomon Worku', 'Almaz Desta'],
  GB: ['Oliver Smith', 'Emma Johnson', 'Harry Williams', 'Sophie Brown', 'Jack Jones', 'Lily Taylor', 'George Davies', 'Amelia Wilson', 'Charlie Evans', 'Isabella Thomas'],
  US: ['Michael Scott', 'Ashley Davis', 'James Miller', 'Jennifer Wilson', 'Robert Moore', 'Jessica Taylor', 'William Anderson', 'Sarah Jackson', 'David White', 'Emily Harris'],
}

const COUNTRY_WEIGHTS = ['KE','KE','KE','KE','UG','TZ','NG','NG','GH','ZA','PH','IN','BD','ET','GB','US']

function rand(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { count = 50, site_id = null } = await req.json().catch(() => ({}))
  const db = createAdminClient()

  // Get existing names to avoid duplicates (scoped to site if provided)
  let existingQ = db.from('fake_traders').select('name')
  if (site_id) existingQ = existingQ.eq('site_id', site_id)
  const { data: existing } = await existingQ
  const existingNames = new Set((existing || []).map((t: any) => t.name))

  // Build a shuffled pool of all available names
  const pool: { name: string; country_code: string }[] = []
  for (const [code, names] of Object.entries(NAMES)) {
    for (const name of names) {
      if (!existingNames.has(name)) pool.push({ name, country_code: code })
    }
  }

  // Shuffle pool
  pool.sort(() => Math.random() - 0.5)

  const toInsert = pool.slice(0, Math.min(count, pool.length)).map(({ name, country_code }, i) => ({
    name,
    avatar_seed: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    country_code,
    profit_today:      rand(10, 800),
    profit_yesterday:  rand(20, 1200),
    profit_this_week:  rand(50, 3000),
    profit_last_week:  rand(30, 2500),
    profit_this_month: rand(100, 8000),
    trades_today:      Math.floor(Math.random() * 15) + 1,
    trades_yesterday:  Math.floor(Math.random() * 20) + 2,
    trades_this_week:  Math.floor(Math.random() * 60) + 5,
    trades_last_week:  Math.floor(Math.random() * 55) + 4,
    trades_this_month: Math.floor(Math.random() * 200) + 10,
    is_active: true,
    sort_order: i,
    site_id: site_id || null,
  }))

  if (toInsert.length === 0) {
    return NextResponse.json({ error: 'No new names available — all names already exist' }, { status: 400 })
  }

  const { error } = await db.from('fake_traders').insert(toInsert)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, generated: toInsert.length })
}
