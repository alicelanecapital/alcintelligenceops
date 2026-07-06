import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  try {
    console.log('Removing BLR and AlexJozi from founders table...')

    const { error } = await supabase
      .from('founders')
      .delete()
      .in('name', ['BLR', 'AlexJozi'])

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully')
    console.log('✅ BLR and AlexJozi removed from founders table')
  } catch (err) {
    console.error('Error applying migration:', err)
    process.exit(1)
  }
}

applyMigration()
